/**
 * The shared contract between the terminal, the BotID client config, and the
 * route handler.
 *
 * `CONTACT_API_PATH` is load-bearing in a way that is easy to miss: BotID's
 * client init and `checkBotId()` on the server must agree on the exact path,
 * and a silent mismatch classifies **every real visitor** as a bot. It lives
 * here as one constant so the two cannot drift.
 */

export const CONTACT_API_PATH = "/api/contact";
export const CONTACT_API_METHOD = "POST";

/** Server-side caps. Client validation is a courtesy, not a control. */
export const LIMITS = {
  name: 100,
  /** RFC 5321 maximum length of a forward path. */
  email: 254,
  message: 2000,
} as const;

export interface ContactRequest {
  name: string;
  email: string;
  message: string;
}

export type ContactResponse =
  /**
   * The notification reached Derenik. `thankYouDelivered` is false when the
   * courtesy email failed — the submission still succeeded, because the thing
   * that mattered happened.
   */
  | { status: "sent"; thankYouDelivered: boolean }
  /** Failed server-side validation. `problems` is keyed by field. */
  | {
      status: "invalid";
      problems: Partial<Record<keyof ContactRequest, string>>;
    }
  /** BotID classified the request as a bot. */
  | { status: "rejected" }
  /** The notification could not be sent. Nothing reached anyone. */
  | { status: "failed" };

export const CONTACT_STATUS_CODES: Record<ContactResponse["status"], number> = {
  sent: 200,
  invalid: 400,
  rejected: 403,
  failed: 502,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate an untrusted request body.
 *
 * Deliberately permissive about email shape — the only authority on whether an
 * address exists is whether mail to it bounces. This rejects obvious nonsense
 * and enforces length caps so nothing unbounded reaches an email template or a
 * subject header.
 */
export function validateContactRequest(
  body: unknown,
):
  | { ok: true; value: ContactRequest }
  | { ok: false; problems: Partial<Record<keyof ContactRequest, string>> } {
  const problems: Partial<Record<keyof ContactRequest, string>> = {};

  if (typeof body !== "object" || body === null) {
    return { ok: false, problems: { name: "malformed request" } };
  }

  const raw = body as Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  const message = typeof raw.message === "string" ? raw.message.trim() : "";

  if (!name) problems.name = "a name is required";
  else if (name.length > LIMITS.name)
    problems.name = `keep the name under ${LIMITS.name} characters`;

  if (!email) problems.email = "an email address is required";
  else if (email.length > LIMITS.email)
    problems.email = `that email address is too long`;
  else if (!EMAIL_PATTERN.test(email))
    problems.email = "that doesn't look like an email address";

  if (!message) problems.message = "an empty message won't tell me much";
  else if (message.length > LIMITS.message)
    problems.message = `keep it under ${LIMITS.message} characters`;

  if (Object.keys(problems).length > 0) return { ok: false, problems };

  return { ok: true, value: { name, email, message } };
}
