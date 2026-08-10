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
      { label: "name", value: "Derenik" },
      { label: "send this?", value: "y" },
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
