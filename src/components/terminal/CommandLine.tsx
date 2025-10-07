"use client";

import { forwardRef, type KeyboardEvent, useEffect, useRef } from "react";
import { getAutocompleteSuggestion } from "@/lib/utils/autocomplete";

interface CommandLineProps {
  onExecuteCommand: (command: string) => void;
  onCancelCommand: (command: string) => void;
  onNavigateHistory: (direction: "up" | "down") => void;
  currentCommand: string;
  onCommandChange: (command: string) => void;
  isLoading?: boolean;
  onSuggestionsChange?: (
    suggestions: string[],
    visible: boolean,
    context?: "command" | "connect-flag" | "mirror-flag",
  ) => void;
}

/**
 * Command input line with prompt
 */
export const CommandLine = forwardRef<HTMLInputElement, CommandLineProps>(
  function CommandLine(
    {
      onExecuteCommand,
      onCancelCommand,
      onNavigateHistory,
      currentCommand,
      onCommandChange,
      isLoading = false,
      onSuggestionsChange,
    },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement>(null);

    // Use forwarded ref if provided, otherwise use internal ref
    const actualRef = ref || inputRef;

    // Auto-focus input
    useEffect(() => {
      const handleGlobalClick = () => {
        const current =
          typeof actualRef === "function" ? null : actualRef?.current;
        if (current && !isLoading) {
          current.focus();
        }
      };

      document.addEventListener("click", handleGlobalClick);
      return () => document.removeEventListener("click", handleGlobalClick);
    }, [isLoading, actualRef]);

    // Focus input on mount
    useEffect(() => {
      const current =
        typeof actualRef === "function" ? null : actualRef?.current;
      if (current && !isLoading) {
        current.focus();
      }
    }, [isLoading, actualRef]);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      // Handle Ctrl+C
      if (e.ctrlKey && e.key === "c") {
        e.preventDefault();
        onCancelCommand(currentCommand);
        return;
      }

      switch (e.key) {
        case "Enter":
          e.preventDefault();
          if (currentCommand.trim() && !isLoading) {
            onExecuteCommand(currentCommand);
            onCommandChange("");
            // Hide suggestions on command execution
            onSuggestionsChange?.([], false);
          }
          break;
        case "Tab":
          e.preventDefault();
          handleTabCompletion();
          break;
        case "ArrowUp":
          e.preventDefault();
          onNavigateHistory("up");
          break;
        case "ArrowDown":
          e.preventDefault();
          onNavigateHistory("down");
          break;
        case "Escape":
          e.preventDefault();
          // Hide suggestions on Escape
          onSuggestionsChange?.([], false);
          break;
      }
    };

    const handleTabCompletion = () => {
      if (!currentCommand.trim()) return;

      const result = getAutocompleteSuggestion(currentCommand);

      switch (result.type) {
        case "complete":
          // Single match - autocomplete
          if (result.completion) {
            if (result.context === "connect-flag") {
              // For flags, append to existing command
              const parts = currentCommand.split(" ");
              parts[parts.length - 1] = result.completion;
              onCommandChange(parts.join(" "));
            } else {
              // For commands, replace entire input
              onCommandChange(result.completion);
            }
            onSuggestionsChange?.([], false);
          }
          break;
        case "multiple":
          // Multiple matches - show suggestions
          if (result.suggestions) {
            onSuggestionsChange?.(result.suggestions, true, result.context);
          }
          break;
        case "none":
          // No matches - hide suggestions
          onSuggestionsChange?.([], false);
          break;
      }
    };

    return (
      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex items-center py-2 sm:py-3 px-3 sm:px-4 bg-black"
      >
        <div className="flex items-center">
          <span className="text-terminal-green select-none mr-2">&gt;</span>
        </div>

        <label htmlFor="command-input" className="sr-only">
          Terminal command input
        </label>

        <input
          id="command-input"
          ref={actualRef}
          type="text"
          value={currentCommand}
          onChange={(e) => {
            onCommandChange(e.target.value);
            // Hide suggestions when user types (except if they're Tab completing)
            if (e.target.value.trim() === "" || !e.target.value.endsWith(" ")) {
              onSuggestionsChange?.([], false);
            }
          }}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          size={Math.max(currentCommand.length + 1, 1)}
          className={`
          !outline-none
          bg-transparent 
          border-none 
          text-terminal-green 
          font-mono 
          text-xs sm:text-sm 
          min-w-[0px]
          caret-terminal-green
          placeholder:text-terminal-green/50
          ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
        `}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="none"
          autoComplete="off"
          placeholder={isLoading ? "Processing..." : ""}
          aria-label="Terminal command input"
          aria-describedby="terminal-help"
          // biome-ignore lint/a11y/noAutofocus: Required for terminal UX
          autoFocus
        />
        <span className="text-terminal-green cursor-blink -ml-4 hidden sm:inline">
          _
        </span>
      </form>
    );
  },
);
