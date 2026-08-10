import { render } from "react-email";
import { NotificationEmail } from "./NotificationEmail";
import { notificationSubject, THANK_YOU_SUBJECT } from "./subjects";
import { ThankYouEmail } from "./ThankYouEmail";

/**
 * Renders templates to the `{ subject, html, text }` triple Resend wants.
 *
 * Both parts are always produced: the plain-text alternative matters for
 * deliverability, and rendering it is also where two formatting bugs showed
 * up in #9 that the HTML happily hid.
 */

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export async function renderNotification(input: {
  name: string;
  email: string;
  message: string;
  sentAt: Date;
}): Promise<RenderedEmail> {
  const sentAt = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(input.sentAt);

  const element = NotificationEmail({
    name: input.name,
    email: input.email,
    message: input.message,
    sentAt: `${sentAt} UTC`,
  });

  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ]);

  return {
    subject: notificationSubject(input.name, input.message),
    html,
    text,
  };
}

export async function renderThankYou(input: {
  name: string;
}): Promise<RenderedEmail> {
  const element = ThankYouEmail({ name: input.name });

  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ]);

  return { subject: THANK_YOU_SUBJECT, html, text };
}
