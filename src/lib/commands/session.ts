import type {
  CommandOutcome,
  CommandResult,
  CommandSession,
  SessionStep,
} from "@/types/terminal";

/**
 * A plain result and a session are told apart by what `execute` returned: an
 * async generator exposes Symbol.asyncIterator, a Promise does not. This is
 * why `CommandResult` needs no "not finished" variant.
 */
export function isCommandSession(
  outcome: CommandOutcome,
): outcome is CommandSession {
  return (
    typeof outcome === "object" &&
    outcome !== null &&
    typeof (outcome as CommandSession)[Symbol.asyncIterator] === "function"
  );
}

/** One answered step, kept for the on-screen transcript. */
export interface SessionAnswer {
  label: string;
  value: string;
}

/** A step that actually suspends the generator. `status` never does. */
export type SuspendingStep = Exclude<SessionStep, { kind: "status" }>;

export interface SessionSnapshot {
  /** The step awaiting an answer, or null while pending or finished. */
  step: SuspendingStep | null;
  /** Status text while the generator is doing work; null otherwise. */
  pending: string | null;
  /** Validation problem for the current step. */
  error: string | null;
  answers: SessionAnswer[];
  done: boolean;
}

const EMPTY: SessionSnapshot = {
  step: null,
  pending: null,
  error: null,
  answers: [],
  done: false,
};

/**
 * Drives a CommandSession. Deliberately free of React and DOM so the contract
 * can be tested directly.
 *
 * The driver never touches command history: answers live here and are handed
 * to the renderer as a transcript, so a visitor's input can't be recalled with
 * up-arrow later.
 */
export class SessionRunner {
  private session: CommandSession;
  private snapshot: SessionSnapshot = EMPTY;
  private onChange: (snapshot: SessionSnapshot) => void;
  private onFinish: (result: CommandResult) => void;
  private finished = false;

  constructor(
    session: CommandSession,
    handlers: {
      onChange: (snapshot: SessionSnapshot) => void;
      onFinish: (result: CommandResult) => void;
    },
  ) {
    this.session = session;
    this.onChange = handlers.onChange;
    this.onFinish = handlers.onFinish;
  }

  getState(): SessionSnapshot {
    return this.snapshot;
  }

  private set(patch: Partial<SessionSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.onChange(this.snapshot);
  }

  /** Runs the generator to its next suspension point. */
  private async advance(input?: string | boolean): Promise<void> {
    if (this.finished) return;

    let next: IteratorResult<SessionStep, CommandResult>;
    try {
      next = await this.session.next(input as string | boolean);
    } catch (error) {
      this.finish({
        output: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      });
      return;
    }

    if (next.done) {
      this.finish(next.value);
      return;
    }

    if (next.value.kind === "status") {
      // Status does not suspend — render it, then keep going.
      this.set({ step: null, pending: next.value.text, error: null });
      await this.advance();
      return;
    }

    this.set({ step: next.value, pending: null, error: null });
  }

  private finish(result: CommandResult) {
    this.finished = true;
    this.set({ step: null, pending: null, error: null, done: true });
    this.onFinish(result);
  }

  async start(): Promise<void> {
    await this.advance();
  }

  /**
   * Answer the current step. A rejected value leaves the step in place so the
   * visitor can fix a typo rather than retype from scratch.
   */
  async submit(raw: string): Promise<void> {
    const { step } = this.snapshot;
    if (!step || this.finished) return;

    if (step.kind === "confirm") {
      const answer = raw.trim().toLowerCase();
      const yes = answer === "y" || answer === "yes";
      const no = answer === "n" || answer === "no" || answer === "";
      if (!yes && !no) {
        this.set({ error: "answer y or n" });
        return;
      }
      this.set({
        answers: [
          ...this.snapshot.answers,
          { label: step.label, value: yes ? "y" : "n" },
        ],
        error: null,
      });
      await this.advance(yes);
      return;
    }

    const problem = step.validate?.(raw) ?? null;
    if (problem) {
      this.set({ error: problem });
      return;
    }

    this.set({
      answers: [...this.snapshot.answers, { label: step.label, value: raw }],
      error: null,
    });
    await this.advance(raw);
  }

  /** Abandon the session. The generator's finally blocks still run. */
  async cancel(): Promise<void> {
    if (this.finished) return;
    this.finished = true;
    try {
      await this.session.return?.({ output: "", type: "cancelled" });
    } catch {
      // A generator that throws on return has nothing useful to tell us.
    }
    this.set({ step: null, pending: null, error: null, done: true });
    this.onFinish({ output: "", type: "cancelled" });
  }

  /** Completions for the live step, if it offers any. */
  completionsFor(prefix: string): string[] {
    const { step } = this.snapshot;
    if (!step || step.kind !== "ask" || !step.completions) return [];
    const lower = prefix.trim().toLowerCase();
    if (!lower) return step.completions.slice();
    return step.completions.filter((c) => c.toLowerCase().startsWith(lower));
  }
}
