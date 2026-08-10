import {
  CONTACT_API_METHOD,
  CONTACT_API_PATH,
  type ContactResponse,
  LIMITS,
} from "@/lib/contact/contract";
import type { CommandResult, CommandSession } from "@/types/terminal";

/**
 * `connect --message` — the interactive contact flow.
 *
 * Interaction decisions come from #8; the response contract from #18. The
 * generator owns the answers, so nothing is lifted into terminal state.
 *
 * Deliberately side-effect free until the confirm step passes: SessionRunner
 * replays this generator to implement back-navigation, so anything observable
 * before the send would happen more than once.
 */

function validateName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "a name is required";
  if (trimmed.length > LIMITS.name)
    return `keep it under ${LIMITS.name} characters`;
  return null;
}

function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "an email address is required";
  if (trimmed.length > LIMITS.email) return "that email address is too long";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed))
    return "that doesn't look like an email address";
  return null;
}

function validateMessage(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "an empty message won't tell me much";
  if (trimmed.length > LIMITS.message)
    return `keep it under ${LIMITS.message} characters`;
  return null;
}

function preview(name: string, email: string, message: string): string {
  return `${name} <${email}>\n\n${message}`;
}

/**
 * Maps the route's response to what the terminal says.
 *
 * A human is never told they are a bot. `rejected` is phrased as the check
 * failing, with a way through — the alternative is accusing a real person of
 * being automated with no recourse.
 */
function describe(response: ContactResponse | null): CommandResult {
  if (response === null) {
    return {
      output:
        "Couldn't reach the server. Check your connection and try again — or email deren.kha@gmail.com directly.",
      type: "error",
    };
  }

  switch (response.status) {
    case "sent":
      return {
        output: response.thankYouDelivered
          ? "Sent. Your message is with me, and a confirmation is on its way to your inbox."
          : "Sent. Your message is with me — though the confirmation email didn't go through, so don't wait for it.",
        type: "text",
      };
    case "rejected":
      return {
        output:
          "The automated check didn't pass, so the message wasn't sent. If you're seeing this and you're not a robot, email deren.kha@gmail.com directly — it goes to the same place.",
        type: "error",
      };
    case "invalid": {
      const problems = Object.values(response.problems).filter(Boolean);
      return {
        output: `The server rejected that: ${problems.join("; ")}.`,
        type: "error",
      };
    }
    case "failed":
      return {
        output:
          "Something broke on my end and the message wasn't sent. Sorry — deren.kha@gmail.com works if you'd rather not retry.",
        type: "error",
      };
  }
}

async function send(body: {
  name: string;
  email: string;
  message: string;
}): Promise<ContactResponse | null> {
  try {
    // `fetch` MUST be called as a bare global here. initBotId monkey-patches
    // window.fetch, and an aliased or module-scope-captured reference bypasses
    // the patch, ships no x-is-human header, and gets the sender classified as
    // a bot. Do not extract this into a shared http helper.
    const response = await fetch(CONTACT_API_PATH, {
      method: CONTACT_API_METHOD,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await response.json()) as ContactResponse;
  } catch {
    return null;
  }
}

export async function* messageFlow(): CommandSession {
  const name = (
    (yield {
      kind: "ask",
      key: "name",
      label: "name",
      validate: validateName,
    }) as string
  ).trim();

  const email = (
    (yield {
      kind: "ask",
      key: "email",
      label: "email",
      validate: validateEmail,
    }) as string
  ).trim();

  const message = (
    (yield {
      kind: "ask",
      key: "message",
      label: "message",
      multiline: true,
      validate: validateMessage,
    }) as string
  ).trim();

  const confirmed = (yield {
    kind: "confirm",
    label: "send?",
    preview: preview(name, email, message),
  }) as boolean;

  if (!confirmed) return { output: "", type: "cancelled" };

  yield { kind: "status", text: "sending" };

  return describe(await send({ name, email, message }));
}
