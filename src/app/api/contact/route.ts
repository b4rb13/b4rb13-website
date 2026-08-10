import { checkBotId } from "botid/server";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { renderNotification, renderThankYou } from "@/emails/render";
import {
  CONTACT_STATUS_CODES,
  type ContactResponse,
  validateContactRequest,
} from "@/lib/contact/contract";
import { idempotencyKey } from "@/lib/contact/idempotency";

/**
 * The `connect --message` send endpoint.
 *
 * Ordering is deliberate (#18): the notification to Derenik goes first, so a
 * Resend outage part-way through still delivers the thing that matters. The
 * thank-you is a courtesy and its failure does not fail the request.
 */

function reply(body: ContactResponse) {
  return NextResponse.json(body, { status: CONTACT_STATUS_CODES[body.status] });
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export async function POST(request: Request) {
  // `checkBotId()` THROWS rather than returning when its prerequisites are
  // unmet — OIDC disabled on the project, or not running on Vercel at all.
  // Unhandled that is a 500 and the contact form is broken for everyone.
  //
  // "The check errored" and "you are a bot" are deliberately different
  // branches. We fail OPEN on the former: during an outage the worst case is
  // spam getting through, whereas failing closed silently swallows genuine
  // messages and tells a human they look like a robot.
  try {
    // In development `checkBotId()` always reports HUMAN, so the rejection
    // branch is otherwise unreachable until a preview deploy. BOTID_DEV_BYPASS
    // forces a verdict locally. Double-gated on NODE_ENV, and the library
    // ignores developmentOptions in production regardless.
    const devBypass =
      process.env.NODE_ENV !== "production" && process.env.BOTID_DEV_BYPASS
        ? {
            developmentOptions: {
              bypass: process.env.BOTID_DEV_BYPASS as "HUMAN" | "BAD-BOT",
            },
          }
        : undefined;

    const verification = await checkBotId(devBypass);
    if (verification.isBot) {
      return reply({ status: "rejected" });
    }
  } catch (error) {
    console.error(
      "[contact] BotID check failed; failing open and sending anyway.",
      error,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return reply({
      status: "invalid",
      problems: { name: "malformed request" },
    });
  }

  const validated = validateContactRequest(body);
  if (!validated.ok) {
    return reply({ status: "invalid", problems: validated.problems });
  }

  const { name, email, message } = validated.value;
  const now = new Date();

  let resend: Resend;
  let from: string;
  let thankYouFrom: string;
  let to: string;
  try {
    resend = new Resend(requiredEnv("RESEND_API_KEY"));
    from = requiredEnv("RESEND_FROM_NOTIFICATION");
    thankYouFrom = requiredEnv("RESEND_FROM_THANKYOU");
    to = requiredEnv("CONTACT_TO_EMAIL");
  } catch (error) {
    console.error("[contact] Misconfigured environment.", error);
    return reply({ status: "failed" });
  }

  // ---- 1. The message to Derenik. This one must succeed. ----
  try {
    const notification = await renderNotification({
      name,
      email,
      message,
      sentAt: now,
    });

    const { error } = await resend.emails.send(
      {
        from: `b4rb13.wtf <${from}>`,
        to: [to],
        // So hitting reply in Gmail answers the visitor directly.
        replyTo: `${name} <${email}>`,
        subject: notification.subject,
        html: notification.html,
        text: notification.text,
      },
      { idempotencyKey: await idempotencyKey(validated.value, now) },
    );

    if (error) {
      console.error("[contact] Notification send failed.", error);
      return reply({ status: "failed" });
    }
  } catch (error) {
    console.error("[contact] Notification send threw.", error);
    return reply({ status: "failed" });
  }

  // ---- 2. The courtesy thank-you. Failure here does not fail the request. ----
  let thankYouDelivered = true;
  try {
    const thankYou = await renderThankYou({ name });

    const { error } = await resend.emails.send(
      {
        from: `Derenik <${thankYouFrom}>`,
        to: [email],
        subject: thankYou.subject,
        html: thankYou.html,
        text: thankYou.text,
      },
      {
        idempotencyKey: `ty-${await idempotencyKey(validated.value, now)}`,
      },
    );

    if (error) {
      console.error("[contact] Thank-you send failed.", error);
      thankYouDelivered = false;
    }
  } catch (error) {
    console.error("[contact] Thank-you send threw.", error);
    thankYouDelivered = false;
  }

  return reply({ status: "sent", thankYouDelivered });
}
