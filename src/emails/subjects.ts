/**
 * Subject lines for the contact emails.
 *
 * The notification subject embeds visitor-supplied text, which makes it the
 * one place in this feature where untrusted input reaches a mail *header*
 * rather than a body. A bare CR or LF there is a header-injection vector, so
 * everything is flattened before it goes anywhere near the wire.
 */

/** Long enough to be useful, short enough that clients rarely truncate it. */
const MAX_SUBJECT_LENGTH = 78;

/**
 * Collapse anything that could break a header — CR, LF, tabs, and runs of
 * whitespace — into single spaces.
 */
export function sanitizeHeaderValue(value: string): string {
  // `\s` already covers CR, LF, tab, vertical tab, form feed, NBSP and the
  // unicode line/paragraph separators — all of which either break a header or
  // render as invisible junk in an inbox list.
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  // Prefer breaking on a word boundary, but never return an empty string.
  const clipped = value.slice(0, max - 1);
  const lastSpace = clipped.lastIndexOf(" ");
  const base = lastSpace > max / 2 ? clipped.slice(0, lastSpace) : clipped;
  return `${base.trimEnd()}…`;
}

/**
 * `Name — first line of their message`, so the inbox list is usually enough
 * to know what arrived without opening it.
 */
export function notificationSubject(name: string, message: string): string {
  const cleanName = sanitizeHeaderValue(name) || "someone";
  const firstLine = sanitizeHeaderValue(message.split("\n")[0] ?? "");

  if (!firstLine) return truncate(cleanName, MAX_SUBJECT_LENGTH);

  return truncate(`${cleanName} — ${firstLine}`, MAX_SUBJECT_LENGTH);
}

export const THANK_YOU_SUBJECT = "message delivered ✓";
