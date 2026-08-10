/**
 * Helpers for forwarding inbound mail.
 *
 * Resend's `forward()` cannot set `reply-to` (confirmed in the SDK types), so
 * a forward is rebuilt with `emails.send()` instead: the original sender goes
 * in `reply-to` so replying in Gmail reaches an actual person, and the `from`
 * stays a verified address on the domain so SPF/DKIM alignment holds.
 */

/** Resend caps a message at 40MB; stay well under it after base64 inflation. */
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

/**
 * Mail sent *by* this domain must never be treated as inbound to forward.
 *
 * Without this, a forward (from contact@b4rb13.wtf) that is ever redelivered
 * to an address on the domain would be forwarded again, and each hop would
 * generate another. A reply to a forwarded message is the realistic trigger.
 */
export function isSelfAddressed(from: string, domain: string): boolean {
  const address = extractAddress(from).toLowerCase();
  return address.endsWith(`@${domain.toLowerCase()}`);
}

/** Pull `x@y.z` out of `Name <x@y.z>`, or return the input trimmed. */
export function extractAddress(value: string): string {
  const angled = value.match(/<([^>]+)>/);
  return (angled ? angled[1] : value).trim();
}

export function forwardSubject(subject: string | null | undefined): string {
  const clean = (subject ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return "Fwd: (no subject)";
  return /^fwd:/i.test(clean) ? clean : `Fwd: ${clean}`;
}

export interface AttachmentPlan {
  /** Attachments small enough to re-attach. */
  include: { id: string; filename: string; contentType: string }[];
  /** Ones skipped for size, named in the body so nothing vanishes silently. */
  skipped: { filename: string; size: number }[];
}

/**
 * Decide which attachments to carry. Oversized ones are named rather than
 * dropped quietly — a forward that silently loses a file is worse than one
 * that says it did.
 */
export function planAttachments(
  attachments: {
    id: string;
    filename: string | null;
    size: number;
    content_type: string;
  }[],
  budget: number = MAX_ATTACHMENT_BYTES,
): AttachmentPlan {
  const plan: AttachmentPlan = { include: [], skipped: [] };
  let used = 0;

  for (const attachment of attachments) {
    const filename = attachment.filename ?? `attachment-${attachment.id}`;
    if (used + attachment.size > budget) {
      plan.skipped.push({ filename, size: attachment.size });
      continue;
    }
    used += attachment.size;
    plan.include.push({
      id: attachment.id,
      filename,
      contentType: attachment.content_type,
    });
  }

  return plan;
}

/** A short header prepended to the forward so its origin is unambiguous. */
export function forwardBanner(input: {
  from: string;
  to: string[];
  receivedAt: string;
  skipped: { filename: string; size: number }[];
}): string {
  const lines = [
    "--- forwarded from b4rb13.wtf ---",
    `from: ${input.from}`,
    `to:   ${input.to.join(", ")}`,
    `at:   ${input.receivedAt}`,
  ];

  if (input.skipped.length > 0) {
    lines.push(
      "",
      `${input.skipped.length} attachment(s) too large to forward:`,
      ...input.skipped.map(
        (file) => `  ${file.filename} (${Math.round(file.size / 1024)} KB)`,
      ),
      "Fetch them from the Resend dashboard.",
    );
  }

  lines.push("---", "");
  return lines.join("\n");
}
