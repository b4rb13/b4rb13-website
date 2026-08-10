import { describe, expect, test } from "bun:test";
import {
  extractAddress,
  forwardBanner,
  forwardSubject,
  isSelfAddressed,
  MAX_ATTACHMENT_BYTES,
  planAttachments,
} from "./inbound";

describe("extractAddress", () => {
  test("pulls the address out of a display-name form", () => {
    expect(extractAddress("Derenik <hey@example.com>")).toBe("hey@example.com");
    expect(extractAddress("<hey@example.com>")).toBe("hey@example.com");
  });

  test("passes a bare address through", () => {
    expect(extractAddress("  hey@example.com  ")).toBe("hey@example.com");
  });
});

describe("isSelfAddressed", () => {
  test("catches our own forwards, which is what prevents a mail loop", () => {
    expect(
      isSelfAddressed("b4rb13.wtf <contact@b4rb13.wtf>", "b4rb13.wtf"),
    ).toBe(true);
    expect(isSelfAddressed("thanks@b4rb13.wtf", "b4rb13.wtf")).toBe(true);
    expect(isSelfAddressed("CONTACT@B4RB13.WTF", "b4rb13.wtf")).toBe(true);
  });

  test("lets genuine outside mail through", () => {
    expect(isSelfAddressed("someone@example.com", "b4rb13.wtf")).toBe(false);
  });

  test("is not fooled by a lookalike domain", () => {
    // Would match a naive `includes` check.
    expect(isSelfAddressed("attacker@notb4rb13.wtf", "b4rb13.wtf")).toBe(false);
    expect(isSelfAddressed("b4rb13.wtf@example.com", "b4rb13.wtf")).toBe(false);
  });
});

describe("forwardSubject", () => {
  test("prefixes Fwd:", () => {
    expect(forwardSubject("hello")).toBe("Fwd: hello");
  });

  test("does not double-prefix", () => {
    expect(forwardSubject("Fwd: hello")).toBe("Fwd: hello");
    expect(forwardSubject("fwd: hello")).toBe("fwd: hello");
  });

  test("handles a missing subject", () => {
    expect(forwardSubject(null)).toBe("Fwd: (no subject)");
    expect(forwardSubject("   ")).toBe("Fwd: (no subject)");
  });

  test("flattens newlines, which would otherwise break the header", () => {
    const subject = forwardSubject("a\r\nBcc: victim@example.com");
    expect(subject).not.toContain("\n");
    expect(subject).not.toContain("\r");
  });
});

describe("planAttachments", () => {
  const file = (id: string, size: number) => ({
    id,
    filename: `${id}.pdf`,
    size,
    content_type: "application/pdf",
  });

  test("includes everything that fits", () => {
    const plan = planAttachments([file("a", 100), file("b", 200)]);
    expect(plan.include.map((f) => f.id)).toEqual(["a", "b"]);
    expect(plan.skipped).toEqual([]);
  });

  test("skips what busts the budget rather than dropping it silently", () => {
    const plan = planAttachments([file("a", 90), file("b", 20)], 100);
    expect(plan.include.map((f) => f.id)).toEqual(["a"]);
    expect(plan.skipped).toEqual([{ filename: "b.pdf", size: 20 }]);
  });

  test("a single oversized attachment is skipped, not force-included", () => {
    const plan = planAttachments([file("huge", 500)], 100);
    expect(plan.include).toEqual([]);
    expect(plan.skipped).toHaveLength(1);
  });

  test("names an attachment that arrived without a filename", () => {
    const plan = planAttachments([
      { id: "x1", filename: null, size: 10, content_type: "text/plain" },
    ]);
    expect(plan.include[0].filename).toBe("attachment-x1");
  });

  test("the default budget stays under Resend's 40MB message cap", () => {
    expect(MAX_ATTACHMENT_BYTES).toBeLessThan(40 * 1024 * 1024);
  });

  test("handles no attachments", () => {
    expect(planAttachments([])).toEqual({ include: [], skipped: [] });
  });
});

describe("forwardBanner", () => {
  const base = {
    from: "someone@example.com",
    to: ["thanks@b4rb13.wtf"],
    receivedAt: "2026-08-10T12:00:00Z",
    skipped: [],
  };

  test("states where the mail came from", () => {
    const banner = forwardBanner(base);
    expect(banner).toContain("someone@example.com");
    expect(banner).toContain("thanks@b4rb13.wtf");
  });

  test("names skipped attachments so nothing vanishes silently", () => {
    const banner = forwardBanner({
      ...base,
      skipped: [{ filename: "huge.zip", size: 30 * 1024 * 1024 }],
    });
    expect(banner).toContain("huge.zip");
    expect(banner).toContain("too large");
  });

  test("says nothing about attachments when none were skipped", () => {
    expect(forwardBanner(base)).not.toContain("too large");
  });
});
