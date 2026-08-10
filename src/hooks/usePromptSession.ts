"use client";

import { useCallback, useRef, useState } from "react";
import type {
  FlowResult,
  MessageDraft,
  Prompt,
} from "@/lib/commands/prototype/messageFlow";
import { messageFlow } from "@/lib/commands/prototype/messageFlow";

/**
 * SPIKE — throwaway driver for wayfinder ticket #8.
 *
 * Drives an async-generator command session. The generator owns the answers
 * (decision from #6), so this hook holds only what the terminal must render:
 * the current prompt, the visible transcript, and transient error/pending
 * state. Answers are deliberately NOT pushed into command history.
 */

export type SessionLine =
  | { kind: "answer"; label: string; value: string }
  | { kind: "note"; text: string };

type Iter = AsyncGenerator<Prompt, FlowResult, string | boolean>;

export function usePromptSession(onFinish: (result: FlowResult) => void) {
  const iterRef = useRef<Iter | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [lines, setLines] = useState<SessionLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const active = prompt !== null || pending !== null;

  const reset = useCallback(() => {
    iterRef.current = null;
    setPrompt(null);
    setLines([]);
    setError(null);
    setPending(null);
  }, []);

  const advance = useCallback(
    async (input?: string | boolean) => {
      const iter = iterRef.current;
      if (!iter) return;

      // `next` is typed to always take an argument; the first call ignores it.
      const step = await iter.next(input as string | boolean);

      if (step.done) {
        const result = step.value;
        iterRef.current = null;
        setPrompt(null);
        setPending(null);
        setError(null);
        // The session transcript is transient: the caller writes a permanent
        // summary into terminal history, so clear ours rather than duplicating.
        setLines([]);
        onFinish(result);
        return;
      }

      const next = step.value;
      if (next.kind === "status") {
        setPrompt(null);
        setPending(next.text);
        // Let the generator continue; it is awaiting real work behind this.
        void advance();
        return;
      }

      setPending(null);
      setPrompt(next);
    },
    [onFinish],
  );

  const start = useCallback(() => {
    iterRef.current = messageFlow();
    setLines([]);
    setError(null);
    void advance();
  }, [advance]);

  const submit = useCallback(
    (raw: string) => {
      if (!prompt) return;

      if (prompt.kind === "confirm") {
        const answer = raw.trim().toLowerCase();
        const yes = answer === "y" || answer === "yes";
        const no = answer === "n" || answer === "no" || answer === "";
        if (!yes && !no) {
          setError("answer y or n");
          return;
        }
        setError(null);
        setLines((prev) => [
          ...prev,
          { kind: "answer", label: prompt.label, value: yes ? "y" : "n" },
        ]);
        void advance(yes);
        return;
      }

      if (prompt.kind === "ask") {
        const problem = prompt.validate?.(raw) ?? null;
        if (problem) {
          setError(problem);
          return;
        }
        setError(null);
        setLines((prev) => [
          ...prev,
          { kind: "answer", label: prompt.label, value: raw },
        ]);
        void advance(raw);
      }
    },
    [prompt, advance],
  );

  const cancel = useCallback(() => {
    if (!active) return false;
    iterRef.current?.return?.({ outcome: "cancelled" } as FlowResult);
    reset();
    return true;
  }, [active, reset]);

  return {
    active,
    prompt,
    lines,
    error,
    pending,
    start,
    submit,
    cancel,
    reset,
  };
}

export type { MessageDraft };
