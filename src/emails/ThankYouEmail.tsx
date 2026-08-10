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
 * The confirmation a visitor gets back, from thanks@b4rb13.wtf.
 *
 * This is the only impression a stranger gets of what happens after they hit
 * send, so it carries the terminal voice deliberately.
 *
 * Two decisions from #9 that are easy to undo by accident:
 *  - it does NOT echo the message body back
 *  - it makes a soft promise ("I read everything that lands here") and never
 *    commits to a timeframe
 *
 * It also does NOT say "do not reply": #12 made thanks@b4rb13.wtf a real
 * receiving address, which was the whole point of enabling inbound.
 *
 * This is transactional mail, so it carries no unsubscribe link — nothing is
 * stored and nobody is subscribed to anything (#7).
 */

export interface ThankYouEmailProps {
  name: string;
}

export function ThankYouEmail({ name }: ThankYouEmailProps) {
  return (
    <Html lang="en">
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head>
          <meta name="color-scheme" content="dark" />
          <meta name="supported-color-schemes" content="dark" />
        </Head>
        <Body className="bg-[#000000] m-0 p-0 font-mono">
          <Preview>Your message reached me — thanks for writing.</Preview>
          <Container className="max-w-[600px] mx-auto bg-[#000000] p-[24px]">
            <Section>
              <Text className="m-0 text-[13px] leading-[22px] text-[#4ade8099]">
                guest@b4rb13.wtf:~${" "}
                <span className="text-[#4ade80]">connect --message</span>
              </Text>
              <Text className="mt-[16px] mb-0 text-[14px] leading-[22px] text-[#facc15]">
                ✓ delivered
              </Text>
            </Section>

            <Hr className="border-none border-t border-solid border-[#4ade8033] my-[20px]" />

            <Section>
              <Text className="m-0 text-[14px] leading-[24px] text-[#4ade80]">
                Hi {name} — your message reached me.
              </Text>
              <Text className="mt-[14px] mb-0 text-[14px] leading-[24px] text-[#4ade80]">
                I read everything that lands here. You can reply to this email
                directly.
              </Text>
              <Text className="mt-[22px] mb-0 text-[14px] leading-[24px] text-[#4ade80]">
                — Derenik
              </Text>
              <Text className="m-0 text-[12px] leading-[20px] text-[#4ade8099]">
                b4rb13.wtf
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

ThankYouEmail.PreviewProps = {
  name: "Derenik",
} satisfies ThankYouEmailProps;

export default ThankYouEmail;
