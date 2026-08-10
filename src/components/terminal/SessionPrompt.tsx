"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import type { SessionLine } from "@/hooks/usePromptSession";
import type { Prompt } from "@/lib/commands/prototype/messageFlow";

/**
 * SPIKE — throwaway UI for wayfinder ticket #8.
 *
 * Shows one concrete answer to "what does the prompt sequence feel like":
 * the shell prompt is replaced by a per-step label, answered steps stay on
 * screen as a transcript, and the message step is a growing textarea.
 */

interface SessionPromptProps {
  lines: SessionLine[];
  prompt: Prompt | null;
  error: string | null;
  pending: string | null;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

const LABEL_WIDTH = 8;

function padLabel(label: string) {
  return label.padEnd(LABEL_WIDTH, " ");
}

export function SessionPrompt({
  lines,
  prompt,
  error,
  pending,
  onSubmit,
  onCancel,
}: SessionPromptProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const multiline = prompt?.kind === "ask" && prompt.multiline === true;

  // `prompt` is a change-trigger here, not a value read in the body: a new
  // prompt object means a new step, so the field clears. A failed validation
  // keeps the same prompt object, which deliberately preserves what the
  // visitor typed so they can fix a typo instead of retyping.
  // biome-ignore lint/correctness/useExhaustiveDependencies: prompt identity is the trigger
  useEffect(() => {
    setValue("");
  }, [prompt]);

  // Focus follows the live control. It is never dropped via `disabled`, which
  // would dismiss the software keyboard mid-flow on mobile.
  // biome-ignore lint/correctness/useExhaustiveDependencies: prompt identity is the trigger
  useEffect(() => {
    if (pending) return;
    if (multiline) areaRef.current?.focus();
    else inputRef.current?.focus();
  }, [prompt, pending, multiline]);

  // Grow the textarea with its content rather than scrolling a 1-line box.
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  const handleKeyDown = (
    e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (e.key === "Escape" || (e.ctrlKey && e.key === "c")) {
      e.preventDefault();
      onCancel();
      return;
    }
    if (e.key === "Enter") {
      // Shift+Enter inserts a newline in the message step; plain Enter sends.
      if (multiline && e.shiftKey) return;
      e.preventDefault();
      if (pending) return;
      onSubmit(value);
    }
  };

  const label =
    prompt?.kind === "confirm"
      ? prompt.label
      : prompt?.kind === "ask"
        ? prompt.label
        : "";

  return (
    <div className="px-3 sm:px-4 py-2 sm:py-3 font-mono text-xs sm:text-sm">
      <div className="text-terminal-green mb-2">
        <span className="select-none text-terminal-yellow mr-2">&gt;</span>
        connect --message
      </div>

      {/* Answered steps stay visible so the visitor can see what they gave. */}
      {lines.map((line, i) => (
        <div
          key={`${line.kind}-${i}`}
          className="text-terminal-green/60 whitespace-pre-wrap break-words"
        >
          {line.kind === "answer" ? (
            <>
              <span className="select-none">{padLabel(line.label)}</span>
              <span className="select-none text-terminal-green/40">{"> "}</span>
              <span className="text-terminal-green/80">{line.value}</span>
            </>
          ) : (
            line.text
          )}
        </div>
      ))}

      {prompt?.kind === "confirm" && (
        <div className="my-2 border-l-2 border-terminal-yellow/40 pl-3 text-terminal-green/80 whitespace-pre-wrap break-words">
          {prompt.preview}
        </div>
      )}

      {pending ? (
        <div className="text-terminal-yellow flex items-center gap-2">
          <span className="animate-pulse">{pending}</span>
          <span className="animate-pulse">…</span>
        </div>
      ) : (
        prompt && (
          <div className="flex items-start">
            <span className="select-none text-terminal-green whitespace-pre">
              {padLabel(label)}
            </span>
            <span className="select-none text-terminal-green/40 mr-1">
              {prompt.kind === "confirm" ? "[y/N]" : ">"}
            </span>
            {multiline ? (
              <textarea
                ref={areaRef}
                value={value}
                rows={1}
                onChange={(e) => {
                  setValue(e.target.value);
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
                }}
                onKeyDown={handleKeyDown}
                className="flex-1 resize-none !outline-none bg-transparent border-none text-terminal-green font-mono text-xs sm:text-sm caret-terminal-green overflow-y-auto"
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="sentences"
                autoComplete="off"
                aria-label={`${label} input`}
              />
            ) : (
              <input
                ref={inputRef}
                type={
                  prompt.kind === "ask" && prompt.key === "email"
                    ? "email"
                    : "text"
                }
                inputMode={
                  prompt.kind === "ask" && prompt.key === "email"
                    ? "email"
                    : "text"
                }
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 !outline-none bg-transparent border-none text-terminal-green font-mono text-xs sm:text-sm caret-terminal-green"
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize={
                  prompt.kind === "ask" && prompt.key === "name"
                    ? "words"
                    : "none"
                }
                autoComplete="off"
                aria-label={`${label} input`}
              />
            )}
          </div>
        )
      )}

      {error && <div className="text-terminal-red mt-1">{error}</div>}

      {!pending && (
        <div className="text-terminal-green/40 mt-2 select-none">
          {multiline
            ? "enter to continue · shift+enter for a new line · esc to cancel"
            : "enter to continue · esc to cancel"}
        </div>
      )}
    </div>
  );
}
