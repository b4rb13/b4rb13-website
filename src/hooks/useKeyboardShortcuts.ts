"use client";

import { useEffect } from "react";

interface KeyboardShortcutsProps {
  onClear: () => void;
  onFocusInput: () => void;
  onExecuteHelp: () => void;
}

/**
 * Hook for managing keyboard shortcuts in the terminal
 */
export function useKeyboardShortcuts({
  onClear,
  onFocusInput,
  onExecuteHelp,
}: KeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Handle keyboard shortcuts
      switch (true) {
        // Ctrl/Cmd + K to clear terminal
        case (event.ctrlKey || event.metaKey) && event.key === "k":
          event.preventDefault();
          onClear();
          break;

        // Ctrl/Cmd + L to clear terminal (alternative)
        case (event.ctrlKey || event.metaKey) && event.key === "l":
          event.preventDefault();
          onClear();
          break;

        // F1 or ? to show help
        case event.key === "F1":
        case event.key === "?":
          event.preventDefault();
          onExecuteHelp();
          break;

        // Any printable character - focus input
        case event.key.length === 1 &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey:
          onFocusInput();
          break;

        // Escape to focus input
        case event.key === "Escape":
          event.preventDefault();
          onFocusInput();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClear, onFocusInput, onExecuteHelp]);
}
