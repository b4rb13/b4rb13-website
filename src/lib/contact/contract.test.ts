import { describe, expect, test } from "bun:test";
import {
  CONTACT_API_METHOD,
  CONTACT_API_PATH,
  LIMITS,
  validateContactRequest,
} from "./contract";
import { hourBucket, idempotencyKey } from "./idempotency";

const valid = {
  name: "Derenik",
  email: "hey@example.com",
  message: "loved the mirror command.",
};

describe("validateContactRequest", () => {
  test("accepts a well-formed request and trims it", () => {
    const result = validateContactRequest({
      name: "  Derenik  ",
      email: " hey@example.com ",
      message: "  hello  ",
    });
    expect(result).toEqual({
      ok: true,
      value: { name: "Derenik", email: "hey@example.com", message: "hello" },
    });
  });

  test("rejects non-object bodies without throwing", () => {
    for (const body of [null, undefined, "string", 42, []]) {
      const result = validateContactRequest(body);
      // An array is an object, so it fails on missing fields rather than shape;
      // either way it must not be accepted and must not throw.
      expect(result.ok).toBe(false);
    }
  });

  test("rejects missing and non-string fields", () => {
    const result = validateContactRequest({
      name: 1,
      email: null,
      message: {},
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.problems.name).toBeDefined();
    expect(result.problems.email).toBeDefined();
    expect(result.problems.message).toBeDefined();
  });

  test("rejects whitespace-only values", () => {
    const result = validateContactRequest({
      name: "   ",
      email: "   ",
      message: "   ",
    });
    expect(result.ok).toBe(false);
  });

  test("enforces every length cap", () => {
    const long = (n: number) => "x".repeat(n + 1);

    const name = validateContactRequest({ ...valid, name: long(LIMITS.name) });
    expect(name.ok).toBe(false);

    const message = validateContactRequest({
      ...valid,
      message: long(LIMITS.message),
    });
    expect(message.ok).toBe(false);

    const email = validateContactRequest({
      ...valid,
      email: `${"x".repeat(LIMITS.email)}@example.com`,
    });
    expect(email.ok).toBe(false);
  });

  test("accepts values exactly at the cap", () => {
    expect(
      validateContactRequest({ ...valid, name: "x".repeat(LIMITS.name) }).ok,
    ).toBe(true);
    expect(
      validateContactRequest({ ...valid, message: "x".repeat(LIMITS.message) })
        .ok,
    ).toBe(true);
  });

  test("rejects obvious email nonsense but stays permissive", () => {
    for (const email of ["nope", "a@b", "a b@c.com", "@example.com", "a@"]) {
      expect(validateContactRequest({ ...valid, email }).ok).toBe(false);
    }
    for (const email of [
      "a+tag@example.co.uk",
      "first.last@sub.example.com",
      "x@y.zz",
    ]) {
      expect(validateContactRequest({ ...valid, email }).ok).toBe(true);
    }
  });

  test("does not strip hostile content — escaping is the renderer's job", () => {
    const payload = '<img/src="x"onerror=alert(1)>';
    const result = validateContactRequest({ ...valid, message: payload });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.value.message).toBe(payload);
  });
});

describe("idempotency", () => {
  test("the same submission in the same hour yields the same key", async () => {
    const a = await idempotencyKey(valid, new Date("2026-08-10T14:05:00Z"));
    const b = await idempotencyKey(valid, new Date("2026-08-10T14:59:00Z"));
    expect(a).toBe(b);
  });

  test("a genuine resend in a later hour is not deduplicated", async () => {
    const a = await idempotencyKey(valid, new Date("2026-08-10T14:05:00Z"));
    const b = await idempotencyKey(valid, new Date("2026-08-10T15:05:00Z"));
    expect(a).not.toBe(b);
  });

  test("different messages from the same person differ", async () => {
    const at = new Date("2026-08-10T14:05:00Z");
    const a = await idempotencyKey(valid, at);
    const b = await idempotencyKey({ ...valid, message: "different" }, at);
    expect(a).not.toBe(b);
  });

  test("email casing does not create a second key", async () => {
    const at = new Date("2026-08-10T14:05:00Z");
    const a = await idempotencyKey(valid, at);
    const b = await idempotencyKey({ ...valid, email: "HEY@Example.com" }, at);
    expect(a).toBe(b);
  });

  test("keys are prefixed and a sane length for Resend", async () => {
    const key = await idempotencyKey(valid, new Date());
    expect(key.startsWith("contact-")).toBe(true);
    expect(key.length).toBeLessThanOrEqual(256);
  });

  test("hourBucket truncates to the hour", () => {
    expect(hourBucket(new Date("2026-08-10T14:59:59Z"))).toBe("2026-08-10T14");
  });
});

describe("the shared BotID path contract", () => {
  test("matches the route file location", () => {
    // If this constant and src/app/api/contact/route.ts ever disagree, BotID
    // classifies every real visitor as a bot and only warns in production.
    expect(CONTACT_API_PATH).toBe("/api/contact");
    expect(CONTACT_API_METHOD).toBe("POST");
  });
});
