import { describe, expect, test } from "bun:test";
import {
  notificationSubject,
  sanitizeHeaderValue,
  THANK_YOU_SUBJECT,
} from "./subjects";

describe("sanitizeHeaderValue", () => {
  test("flattens CR and LF, the header-injection vectors", () => {
    expect(sanitizeHeaderValue("a\r\nBcc: victim@example.com")).toBe(
      "a Bcc: victim@example.com",
    );
    expect(sanitizeHeaderValue("a\nb")).toBe("a b");
    expect(sanitizeHeaderValue("a\rb")).toBe("a b");
  });

  test("collapses tabs, vertical tabs and unicode spaces", () => {
    expect(sanitizeHeaderValue("a\tb\vc\fd")).toBe("a b c d");
    expect(sanitizeHeaderValue("a  b")).toBe("a b");
  });

  test("trims and collapses runs of whitespace", () => {
    expect(sanitizeHeaderValue("   a     b   ")).toBe("a b");
    expect(sanitizeHeaderValue("   ")).toBe("");
  });
});

describe("notificationSubject", () => {
  test("reads as name — first line", () => {
    expect(notificationSubject("Derenik", "loved the mirror command.")).toBe(
      "Derenik — loved the mirror command.",
    );
  });

  test("uses only the first line of a multi-line message", () => {
    expect(
      notificationSubject("Derenik", "first line\nsecond line\nthird"),
    ).toBe("Derenik — first line");
  });

  test("cannot inject a header through the name or the message", () => {
    const subject = notificationSubject(
      "Derenik\r\nBcc: victim@example.com",
      "hello",
    );
    expect(subject).not.toContain("\r");
    expect(subject).not.toContain("\n");

    const fromMessage = notificationSubject(
      "Derenik",
      "hi\r\nSubject: spoofed",
    );
    expect(fromMessage).not.toContain("\r");
    expect(fromMessage).not.toContain("\n");
  });

  test("falls back when the name is empty or whitespace", () => {
    expect(notificationSubject("   ", "hello there")).toBe(
      "someone — hello there",
    );
  });

  test("falls back to the name alone when the message has no first line", () => {
    expect(notificationSubject("Derenik", "")).toBe("Derenik");
    expect(notificationSubject("Derenik", "\n\nbody after blanks")).toBe(
      "Derenik",
    );
  });

  test("truncates long subjects on a word boundary", () => {
    const long = "word ".repeat(60).trim();
    const subject = notificationSubject("Derenik", long);

    expect(subject.length).toBeLessThanOrEqual(78);
    expect(subject.endsWith("…")).toBe(true);
    // Broke on a boundary rather than mid-word.
    expect(subject).not.toMatch(/wor…$/);
  });

  test("truncates a single unbroken token without returning empty", () => {
    const subject = notificationSubject("Derenik", "x".repeat(200));
    expect(subject.length).toBeLessThanOrEqual(78);
    expect(subject.startsWith("Derenik — ")).toBe(true);
    expect(subject.endsWith("…")).toBe(true);
  });

  test("leaves a short subject untouched, with no ellipsis", () => {
    expect(notificationSubject("Jo", "hi").endsWith("…")).toBe(false);
  });
});

describe("THANK_YOU_SUBJECT", () => {
  test("is a single clean header line", () => {
    expect(THANK_YOU_SUBJECT).toBe("message delivered ✓");
    expect(sanitizeHeaderValue(THANK_YOU_SUBJECT)).toBe(THANK_YOU_SUBJECT);
  });
});
