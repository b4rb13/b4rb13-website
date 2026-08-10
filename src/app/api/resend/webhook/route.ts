import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  extractAddress,
  forwardBanner,
  forwardSubject,
  isSelfAddressed,
  planAttachments,
} from "@/lib/contact/inbound";

/**
 * Resend webhook.
 *
 * Two jobs behind one signature check (#10):
 *
 *  1. `email.received` — forward inbound mail to Derenik's inbox. This is the
 *     half that *sends mail on demand*, which is why the signature check is
 *     not optional: an attacker who could forge events would have a free relay
 *     off a verified domain.
 *  2. delivery events — bounces and complaints are logged. Nothing more: a
 *     bounced notification means the inbox we would notify is the one that
 *     just failed, so email cannot be its own fallback (#10).
 *
 * Every other event type is acknowledged and ignored. The subscription covers
 * all 17, so unhandled types must return 200 or Resend retries them forever.
 */

const DOMAIN = "b4rb13.wtf";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

async function forwardInbound(
  resend: Resend,
  emailId: string,
  to: string,
  from: string,
) {
  const { data: inbound, error } = await resend.emails.receiving.get(emailId);
  if (error || !inbound) {
    console.error("[webhook] Could not fetch inbound email.", emailId, error);
    return;
  }

  if (isSelfAddressed(inbound.from, DOMAIN)) {
    // Our own forward coming back around. Dropping it here is what stops a
    // reply-to-a-forward turning into a loop.
    console.warn("[webhook] Ignoring self-addressed inbound.", inbound.from);
    return;
  }

  const plan = planAttachments(inbound.attachments ?? []);

  const attachments = (
    await Promise.all(
      plan.include.map(async (file) => {
        try {
          const { data } = await resend.emails.receiving.attachments.get({
            emailId,
            id: file.id,
          });
          if (!data?.download_url) return null;

          // Downloaded and inlined rather than passed as a URL: Resend fetches
          // URL attachments *after* accepting the send, so an unreachable link
          // fails the whole email asynchronously and silently.
          const response = await fetch(data.download_url);
          if (!response.ok) return null;
          const bytes = Buffer.from(await response.arrayBuffer());

          return {
            filename: file.filename,
            content: bytes,
            contentType: file.contentType,
          };
        } catch (cause) {
          console.error("[webhook] Attachment fetch failed.", file.id, cause);
          return null;
        }
      }),
    )
  ).filter((file) => file !== null);

  const banner = forwardBanner({
    from: inbound.from,
    to: inbound.received_for ?? inbound.to,
    receivedAt: inbound.created_at,
    skipped: plan.skipped,
  });

  const { error: sendError } = await resend.emails.send(
    {
      from: `b4rb13.wtf <${from}>`,
      to: [to],
      // The whole reason this is a rebuild rather than resend.forward().
      replyTo: extractAddress(inbound.from),
      subject: forwardSubject(inbound.subject),
      text: `${banner}${inbound.text ?? ""}`,
      ...(inbound.html
        ? { html: `<pre>${escapeHtml(banner)}</pre>${inbound.html}` }
        : {}),
      attachments,
    },
    // Resend redelivers on failure; keyed on the inbound id so a retry cannot
    // forward the same message twice.
    { idempotencyKey: `inbound-${emailId}` },
  );

  if (sendError) {
    console.error("[webhook] Forward failed.", emailId, sendError);
  }
}

/**
 * The inbound HTML is untrusted third-party content and is passed through to a
 * mail client, which is the appropriate sandbox for it. Only our own banner is
 * escaped, because that is the part we inject into the markup.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function POST(request: Request) {
  let resend: Resend;
  let secret: string;
  let notifyFrom: string;
  let inboxTo: string;
  try {
    resend = new Resend(requiredEnv("RESEND_API_KEY"));
    secret = requiredEnv("RESEND_WEBHOOK_SECRET");
    notifyFrom = requiredEnv("RESEND_FROM_NOTIFICATION");
    inboxTo = requiredEnv("CONTACT_TO_EMAIL");
  } catch (error) {
    console.error("[webhook] Misconfigured environment.", error);
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }

  const payload = await request.text();

  let event: ReturnType<typeof resend.webhooks.verify>;
  try {
    // Resend wants the three Svix headers by name, not a web Headers object.
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
      webhookSecret: secret,
    });
  } catch (error) {
    // Unsigned or tampered. Never process — this endpoint can send mail.
    console.warn("[webhook] Rejected an unverified payload.", error);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "email.received":
        await forwardInbound(resend, event.data.email_id, inboxTo, notifyFrom);
        break;

      case "email.bounced": {
        const recipients = event.data.to ?? [];
        const toSelf = recipients.some(
          (address) => extractAddress(address) === inboxTo,
        );
        if (toSelf) {
          // The message is lost and the inbox we would notify is the one that
          // just bounced. Logging is the honest limit here (#10).
          console.error(
            "[webhook] NOTIFICATION BOUNCED — a visitor's message did not reach the inbox.",
            { to: recipients, bounce: event.data.bounce },
          );
        } else {
          console.warn(
            "[webhook] Thank-you bounced; the sender's address is bad.",
            {
              to: recipients,
              bounce: event.data.bounce,
            },
          );
        }
        break;
      }

      case "email.complained":
        console.warn("[webhook] Complaint — domain reputation signal.", {
          to: event.data.to,
        });
        break;

      default:
        // Subscribed to all 17 event types; the rest are acknowledged so
        // Resend stops retrying them.
        break;
    }
  } catch (error) {
    // A 500 tells Resend to retry, which is right for a transient failure.
    console.error("[webhook] Handler failed.", event.type, error);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
