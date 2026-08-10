"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import type { SessionSnapshot } from "@/lib/commands/session";

/**
 * Renders an interactive command session: the shell prompt is replaced by a
 * per-step label, answered steps stay on screen as a transcript.
 *
 * Interaction rules are the #8 decisions. Three are easy to break by accident:
 *
 *  - the multi-line step ends on a BLANK LINE, not on plain enter. `shift+enter`
 *    was rejected because phones have no shift key.
 *  - up-arrow goes back a field, but ONLY at cursor position 0 of the first
 *    line — otherwise it must keep its normal meaning inside the textarea.
 *  - inputs render at 16px below `sm`, because iOS Safari force-zooms anything
 *    smaller and never zooms back out.
 */

interface SessionPromptProps {
  command: string;
  session: SessionSnapshot;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  onBack: () => void;
  canGoBack: boolean;
}

const LABEL_WIDTH = "w-[68px] sm:w-[76px] whitespace-nowrap";
/** 16px below `sm` keeps iOS Safari from force-zooming on focus. */
const FIELD_TEXT = "text-[16px] sm:text-sm";

/** Grow the textarea with its content instead of scrolling a one-line box. */
function grow(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
}

export function SessionPrompt({
  command,
  session,
  onSubmit,
  onCancel,
  onBack,
  canGoBack,
}: SessionPromptProps) {
  const { step, answers, error, pending, prefill } = session;
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const multiline = step?.kind === "ask" && step.multiline === true;

  // A new step object means a new question, so the field resets — except when
  // returning to an earlier step, which seeds it with the previous answer.
  // A failed validation keeps the same step object, deliberately preserving
  // what was typed so a typo can be fixed rather than retyped.
  // biome-ignore lint/correctness/useExhaustiveDependencies: step identity is the trigger
  useEffect(() => {
    setValue(prefill ?? "");
  }, [step, prefill]);

  // Focus follows the live control, and is never dropped via `disabled` —
  // that would dismiss the software keyboard mid-flow on mobile.
  // biome-ignore lint/correctness/useExhaustiveDependencies: step identity is the trigger
  useEffect(() => {
    if (pending) return;
    if (multiline) areaRef.current?.focus();
    else inputRef.current?.focus();
  }, [step, pending, multiline]);

  // Driven off `value` so a textarea seeded by `prefill` sizes correctly too.
  // `value` is the change trigger; the height is read from the DOM, not from it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: value is the trigger
  useEffect(() => {
    if (areaRef.current) grow(areaRef.current);
  }, [value]);

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (event.key === "Escape" || (event.ctrlKey && event.key === "c")) {
      event.preventDefault();
      onCancel();
      return;
    }

    if (event.key === "ArrowUp" && canGoBack) {
      const target = event.currentTarget;
      // Only hijack up-arrow when the caret is at the very start; inside the
      // message textarea it must still move between lines.
      const atStart = target.selectionStart === 0 && target.selectionEnd === 0;
      if (atStart) {
        event.preventDefault();
        onBack();
      }
      return;
    }

    if (event.key !== "Enter") return;

    if (pending) {
      event.preventDefault();
      return;
    }

    if (multiline) {
      // Blank line ends the step. Works identically on desktop and mobile,
      // which shift+enter does not.
      const caret = event.currentTarget.selectionStart ?? value.length;
      const currentLine = value.slice(0, caret).split("\n").pop() ?? "";
      if (currentLine.trim() !== "") return; // let the newline through
      event.preventDefault();
      onSubmit(value.replace(/\n+$/, ""));
      return;
    }

    event.preventDefault();
    onSubmit(value);
  };

  const hint = pending
    ? null
    : multiline
      ? "enter on a blank line to finish · esc to cancel"
      : canGoBack
        ? "enter to continue · ↑ to go back · esc to cancel"
        : "enter to continue · esc to cancel";

  return (
    <div className="px-3 sm:px-4 py-2 sm:py-3 font-mono text-xs sm:text-sm">
      <div className="text-terminal-green mb-2">
        <span className="select-none text-terminal-yellow mr-2">&gt;</span>
        {command}
      </div>

      {answers.map((answer, index) => (
        <div
          key={`${answer.label}-${index}`}
          className="flex items-start text-terminal-green/60"
        >
          <span className={`${LABEL_WIDTH} shrink-0 select-none`}>
            {answer.label}
          </span>
          <span className="select-none text-terminal-green/40 mr-2">&gt;</span>
          {/* min-w-0 so a long answer wraps inside the column instead of
              escaping back to the left margin. */}
          <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-terminal-green/80">
            {answer.value}
          </span>
        </div>
      ))}

      {step?.kind === "confirm" && (
        <div className="my-2 border-l-2 border-solid border-terminal-yellow/40 pl-3 whitespace-pre-wrap break-words text-terminal-green/80">
          {step.preview}
        </div>
      )}

      {pending ? (
        <div className="text-terminal-yellow animate-pulse">{pending}…</div>
      ) : (
        step && (
          <div className="flex items-start">
            <span
              className={`${LABEL_WIDTH} shrink-0 select-none text-terminal-green`}
            >
              {step.label}
            </span>
            <span className="select-none text-terminal-green/40 mr-2">
              {step.kind === "confirm" ? "[y/N]" : ">"}
            </span>
            {multiline ? (
              <textarea
                ref={areaRef}
                value={value}
                rows={1}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={handleKeyDown}
                className={`min-w-0 flex-1 resize-none !outline-none bg-transparent border-none text-terminal-green font-mono ${FIELD_TEXT} caret-terminal-green`}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="sentences"
                autoComplete="off"
                aria-label={`${step.label} input`}
              />
            ) : (
              <input
                ref={inputRef}
                type="text"
                inputMode={
                  step.kind === "ask" && step.key === "email" ? "email" : "text"
                }
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={handleKeyDown}
                className={`min-w-0 flex-1 !outline-none bg-transparent border-none text-terminal-green font-mono ${FIELD_TEXT} caret-terminal-green`}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize={
                  step.kind === "ask" && step.key === "name" ? "words" : "none"
                }
                autoComplete="off"
                aria-label={`${step.label} input`}
              />
            )}
          </div>
        )
      )}

      {error && (
        <div className="mt-1 text-terminal-red" role="alert">
          {error}
        </div>
      )}

      {hint && (
        <div className="mt-2 select-none text-terminal-green/40">{hint}</div>
      )}
    </div>
  );
}
