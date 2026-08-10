import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  pixelBasedPreset,
  Section,
  Tailwind,
  Text,
} from "react-email";

/**
 * The message landing in Derenik's inbox.
 *
 * Job: skimmable on a phone and, above all, replyable — the route sets
 * `reply-to` to the visitor, so hitting reply in Gmail answers them directly.
 *
 * All visitor text is interpolated as JSX children, never as raw HTML, so
 * React escapes it. Do not introduce `dangerouslySetInnerHTML` here.
 */

export interface NotificationEmailProps {
  name: string;
  email: string;
  message: string;
  sentAt: string;
}

const LABEL = "w-[72px] text-[#4ade8066] m-0 inline-block align-top";

/**
 * A labelled row. The separator is a real text node, not padding: the
 * plain-text part strips all CSS, and without it the output reads
 * "nameDerenik".
 */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <Text className="m-0 text-[13px] leading-[22px] text-[#4ade80]">
      <span className={LABEL}>{label}</span>
      <span className="text-[#4ade8066]">{" > "}</span>
      {value}
    </Text>
  );
}

export function NotificationEmail({
  name,
  email,
  message,
  sentAt,
}: NotificationEmailProps) {
  return (
    <Html lang="en">
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head>
          <meta name="color-scheme" content="dark" />
          <meta name="supported-color-schemes" content="dark" />
        </Head>
        <Body className="bg-[#000000] m-0 p-0 font-mono">
          <Preview>{`${name} <${email}> — ${message.split("\n")[0]}`}</Preview>
          <Container className="max-w-[600px] mx-auto bg-[#000000] p-[24px]">
            <Section>
              <Field label="name" value={name} />
              <Field label="email" value={email} />
              <Field label="sent" value={sentAt} />
            </Section>

            <Hr className="border-none border-t border-solid border-[#facc1566] my-[20px]" />

            <Section>
              {/*
                Explicit <br> per line, not just `white-space: pre-wrap`. CSS
                is stripped from the plain-text part, so relying on it alone
                collapses a multi-line message into one run-on paragraph.
              */}
              <Text className="m-0 text-[14px] leading-[24px] text-[#4ade80] whitespace-pre-wrap">
                {message.split("\n").map((line, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: lines are positional and the list is static
                  <span key={index}>
                    {line}
                    <br />
                  </span>
                ))}
              </Text>
            </Section>

            <Hr className="border-none border-t border-solid border-[#facc1566] my-[20px]" />

            <Section>
              <Text className="m-0 text-[12px] leading-[20px] text-[#4ade8099]">
                Reply to this email to answer {name} directly.
              </Text>
              <Text className="m-0 text-[12px] leading-[20px] text-[#4ade8099]">
                Sent by connect --message on b4rb13.wtf
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

NotificationEmail.PreviewProps = {
  name: "Derenik",
  email: "hey@example.com",
  message: "loved the mirror command.\nhow did you build the ascii camera?",
  sentAt: "10 Aug 2026, 14:32",
} satisfies NotificationEmailProps;

export default NotificationEmail;
