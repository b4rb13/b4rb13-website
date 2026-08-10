/**
 * SPIKE — throwaway prototype for wayfinder ticket #8.
 *
 * Exists to make the `connect --message` interaction concrete enough to react
 * to. It deliberately implements the async-generator contract decided in #6 so
 * the shape can be judged, but nothing here is meant to survive: the real
 * version lands on top of the registry refactor (#14), and the send is stubbed.
 */

export type Prompt =
  | {
      kind: "ask";
      key: string;
      label: string;
      multiline?: boolean;
      validate?: (value: string) => string | null;
    }
  | { kind: "confirm"; label: string; preview: string }
  | { kind: "status"; text: string }
  | { kind: "error"; text: string };

export type MessageDraft = {
  name: string;
  email: string;
  message: string;
};

export type FlowResult =
  | { outcome: "sent"; draft: MessageDraft }
  | { outcome: "cancelled" };

/** Deliberately permissive. Real validation is the server's job. */
function validateEmail(value: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    ? null
    : "that doesn't look like an email address";
}

function validateName(value: string): string | null {
  return value.trim().length > 0 ? null : "a name is required";
}

function validateMessage(value: string): string | null {
  if (value.trim().length === 0) return "an empty message won't tell me much";
  if (value.length > 2000) return "keep it under 2000 characters";
  return null;
}

/** Stubbed send. The real one goes through a BotID-protected route. */
async function fakeSend(_draft: MessageDraft): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1800));
}

export async function* messageFlow(): AsyncGenerator<
  Prompt,
  FlowResult,
  string | boolean
> {
  const name = (yield {
    kind: "ask",
    key: "name",
    label: "name",
    validate: validateName,
  }) as string;

  const email = (yield {
    kind: "ask",
    key: "email",
    label: "email",
    validate: validateEmail,
  }) as string;

  const message = (yield {
    kind: "ask",
    key: "message",
    label: "message",
    multiline: true,
    validate: validateMessage,
  }) as string;

  const draft: MessageDraft = {
    name: name.trim(),
    email: email.trim(),
    message: message.trim(),
  };

  const confirmed = (yield {
    kind: "confirm",
    label: "send this?",
    preview: `${draft.name} <${draft.email}>\n\n${draft.message}`,
  }) as boolean;

  if (!confirmed) return { outcome: "cancelled" };

  yield { kind: "status", text: "sending" };
  await fakeSend(draft);

  return { outcome: "sent", draft };
}
