import { describe, expect, test } from "bun:test";
import type { CommandResult, CommandSession } from "@/types/terminal";
import {
  isCommandSession,
  SessionRunner,
  type SessionSnapshot,
} from "./session";

function collect(session: CommandSession) {
  const snapshots: SessionSnapshot[] = [];
  let finished: CommandResult | null = null;
  const runner = new SessionRunner(session, {
    onChange: (s) => snapshots.push(s),
    onFinish: (r) => {
      finished = r;
    },
  });
  return {
    runner,
    snapshots,
    result: () => finished as CommandResult | null,
  };
}

async function* twoStepFlow(): CommandSession {
  const name = (yield {
    kind: "ask",
    key: "name",
    label: "name",
    validate: (v: string) => (v.trim() ? null : "a name is required"),
  }) as string;

  const ok = (yield {
    kind: "confirm",
    label: "send this?",
    preview: name,
  }) as boolean;

  if (!ok) return { output: "", type: "cancelled" };

  yield { kind: "status", text: "sending" };

  return { output: `sent for ${name}`, type: "text" };
}

describe("isCommandSession", () => {
  test("recognises an async generator", () => {
    expect(isCommandSession(twoStepFlow())).toBe(true);
  });

  test("rejects a plain result and a promise", () => {
    expect(isCommandSession({ output: "hi", type: "text" })).toBe(false);
    expect(
      isCommandSession(Promise.resolve({ output: "hi", type: "text" })),
    ).toBe(false);
  });
});

describe("SessionRunner", () => {
  test("walks steps and returns the command result", async () => {
    const { runner, result } = collect(twoStepFlow());

    await runner.start();
    expect(runner.getState().step?.kind).toBe("ask");

    await runner.submit("Derenik");
    expect(runner.getState().step?.kind).toBe("confirm");

    await runner.submit("y");
    expect(result()).toEqual({ output: "sent for Derenik", type: "text" });
    expect(runner.getState().done).toBe(true);
  });

  test("a rejected value keeps the step so a typo can be fixed", async () => {
    const { runner } = collect(twoStepFlow());
    await runner.start();

    await runner.submit("   ");
    expect(runner.getState().error).toBe("a name is required");
    expect(runner.getState().step?.kind).toBe("ask");
    expect(runner.getState().answers).toEqual([]);

    await runner.submit("Derenik");
    expect(runner.getState().error).toBeNull();
    expect(runner.getState().step?.kind).toBe("confirm");
  });

  test("records answers for the transcript", async () => {
    const { runner } = collect(twoStepFlow());
    await runner.start();
    await runner.submit("Derenik");
    await runner.submit("y");

    expect(runner.getState().answers).toEqual([
      { label: "name", value: "Derenik", sent: "Derenik" },
      { label: "send this?", value: "y", sent: true },
    ]);
  });

  test("a status step renders without suspending", async () => {
    const { runner, snapshots } = collect(twoStepFlow());
    await runner.start();
    await runner.submit("Derenik");
    await runner.submit("y");

    // "sending" must have been visible at some point, and must not be the
    // resting state — the generator continues straight through it.
    expect(snapshots.some((s) => s.pending === "sending")).toBe(true);
    expect(runner.getState().pending).toBeNull();
  });

  test("confirm accepts y/n and rejects anything else", async () => {
    const { runner, result } = collect(twoStepFlow());
    await runner.start();
    await runner.submit("Derenik");

    await runner.submit("maybe");
    expect(runner.getState().error).toBe("answer y or n");

    await runner.submit("n");
    expect(result()).toEqual({ output: "", type: "cancelled" });
  });

  test("empty input at a confirm step means no", async () => {
    const { runner, result } = collect(twoStepFlow());
    await runner.start();
    await runner.submit("Derenik");
    await runner.submit("");
    expect(result()?.type).toBe("cancelled");
  });

  test("cancel finishes the session and runs generator cleanup", async () => {
    let cleanedUp = false;
    async function* withCleanup(): CommandSession {
      try {
        yield { kind: "ask", key: "name", label: "name" };
        return { output: "unreachable", type: "text" };
      } finally {
        cleanedUp = true;
      }
    }

    const { runner, result } = collect(withCleanup());
    await runner.start();
    await runner.cancel();

    expect(cleanedUp).toBe(true);
    expect(result()).toEqual({ output: "", type: "cancelled" });
    expect(runner.getState().done).toBe(true);
  });

  test("submitting after the session ended is a no-op", async () => {
    const { runner } = collect(twoStepFlow());
    await runner.start();
    await runner.cancel();
    await runner.submit("late");
    expect(runner.getState().answers).toEqual([]);
  });

  test("a throwing generator surfaces as an error result, not a crash", async () => {
    async function* boom(): CommandSession {
      yield { kind: "ask", key: "x", label: "x" };
      throw new Error("send failed");
    }

    const { runner, result } = collect(boom());
    await runner.start();
    await runner.submit("anything");

    expect(result()?.type).toBe("error");
    expect(result()?.output).toContain("send failed");
  });

  test("completions are per-step and filtered by prefix", async () => {
    async function* withCompletions(): CommandSession {
      yield {
        kind: "ask",
        key: "colour",
        label: "colour",
        completions: ["green", "grey", "blue"],
      };
      return { output: "", type: "text" };
    }

    const { runner } = collect(withCompletions());
    await runner.start();

    expect(runner.completionsFor("")).toEqual(["green", "grey", "blue"]);
    expect(runner.completionsFor("gr")).toEqual(["green", "grey"]);
    expect(runner.completionsFor("z")).toEqual([]);
  });

  test("a step with no completions makes Tab inert", async () => {
    const { runner } = collect(twoStepFlow());
    await runner.start();
    expect(runner.completionsFor("")).toEqual([]);
  });
});

describe("SessionRunner.back", () => {
  /** Three fields, so there is a middle step to return to. */
  function threeStepFlow(): CommandSession {
    return (async function* () {
      const a = (yield { kind: "ask", key: "a", label: "a" }) as string;
      const b = (yield { kind: "ask", key: "b", label: "b" }) as string;
      const c = (yield { kind: "ask", key: "c", label: "c" }) as string;
      return { output: `${a}/${b}/${c}`, type: "text" };
    })();
  }

  function withBack() {
    let finished: CommandResult | null = null;
    const runner = new SessionRunner(threeStepFlow(), {
      onChange: () => {},
      onFinish: (r) => {
        finished = r;
      },
      restart: threeStepFlow,
    });
    return { runner, result: () => finished as CommandResult | null };
  }

  test("is unavailable at the first step", async () => {
    const { runner } = withBack();
    await runner.start();
    expect(runner.canGoBack()).toBe(false);
    expect(await runner.back()).toBe(false);
  });

  test("is unavailable when no restart factory was supplied", async () => {
    const runner = new SessionRunner(threeStepFlow(), {
      onChange: () => {},
      onFinish: () => {},
    });
    await runner.start();
    await runner.submit("one");
    expect(runner.canGoBack()).toBe(false);
  });

  test("returns to the previous step with the answer restored", async () => {
    const { runner } = withBack();
    await runner.start();
    await runner.submit("one");
    await runner.submit("two");
    expect(runner.getState().step?.label).toBe("c");

    expect(await runner.back()).toBe(true);
    expect(runner.getState().step?.label).toBe("b");
    expect(runner.getState().prefill).toBe("two");
    expect(runner.getState().answers).toEqual([
      { label: "a", value: "one", sent: "one" },
    ]);
  });

  test("a corrected answer flows through to the result", async () => {
    const { runner, result } = withBack();
    await runner.start();
    await runner.submit("one");
    await runner.submit("typo");
    await runner.back();
    await runner.submit("fixed");
    await runner.submit("three");

    expect(result()?.output).toBe("one/fixed/three");
  });

  test("stepping back twice reaches the first step", async () => {
    const { runner } = withBack();
    await runner.start();
    await runner.submit("one");
    await runner.submit("two");

    await runner.back();
    await runner.back();

    expect(runner.getState().step?.label).toBe("a");
    expect(runner.getState().prefill).toBe("one");
    expect(runner.canGoBack()).toBe(false);
  });

  test("emits exactly one snapshot for a back, not the whole replay", async () => {
    const snapshots: SessionSnapshot[] = [];
    const runner = new SessionRunner(threeStepFlow(), {
      onChange: (s) => snapshots.push(s),
      onFinish: () => {},
      restart: threeStepFlow,
    });
    await runner.start();
    await runner.submit("one");
    await runner.submit("two");

    const before = snapshots.length;
    await runner.back();
    expect(snapshots.length - before).toBe(1);
  });

  test("clears a validation error when stepping back", async () => {
    function validating(): CommandSession {
      return (async function* () {
        const a = (yield { kind: "ask", key: "a", label: "a" }) as string;
        yield {
          kind: "ask",
          key: "b",
          label: "b",
          validate: (v: string) => (v === "bad" ? "no" : null),
        };
        return { output: a, type: "text" };
      })();
    }
    const runner = new SessionRunner(validating(), {
      onChange: () => {},
      onFinish: () => {},
      restart: validating,
    });
    await runner.start();
    await runner.submit("one");
    await runner.submit("bad");
    expect(runner.getState().error).toBe("no");

    await runner.back();
    expect(runner.getState().error).toBeNull();
    expect(runner.getState().step?.label).toBe("a");
  });
});
