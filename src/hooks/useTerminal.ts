"use client";

import { useCallback, useState } from "react";
import type { CommandResult, TerminalState } from "@/types/terminal";

/**
 * Hook for managing terminal state and functionality
 */
export function useTerminal() {
  const [state, setState] = useState<TerminalState>({
    history: [],
    commandHistory: [],
    currentCommand: "",
    isLoading: false,
    currentHistoryIndex: -1,
    isCommandRunning: false,
    runningCommand: undefined,
  });

  // Command handler will be integrated in the next step

  /**
   * Add a command and its result to history
   */
  const addToHistory = useCallback((command: string, result: CommandResult) => {
    setState((prev) => ({
      ...prev,
      history: [
        ...prev.history,
        {
          command,
          result,
          timestamp: new Date(),
        },
      ],
      // Add to command history if not empty and not duplicate
      commandHistory:
        command.trim() &&
        prev.commandHistory[prev.commandHistory.length - 1] !== command.trim()
          ? [...prev.commandHistory, command.trim()]
          : prev.commandHistory,
      currentHistoryIndex: -1,
    }));
  }, []);

  /**
   * Execute a command
   */
  const executeCommand = useCallback(
    async (command: string) => {
      if (!command.trim()) return;

      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        // Import command handler dynamically to avoid circular dependencies
        const { executeBasicCommand } = await import(
          "@/lib/commands/basicCommands"
        );
        const result = await executeBasicCommand(command.trim());

        addToHistory(command, result);

        // Handle special actions
        if (result.action === "clear") {
          setState((prev) => ({
            ...prev,
            history: [],
            isLoading: false,
          }));
          return;
        } else if (result.action === "openLink" && result.actionData?.url) {
          window.open(result.actionData.url, "_blank");
        }
      } catch (error) {
        const errorResult: CommandResult = {
          output: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          type: "error",
        };
        addToHistory(command, errorResult);
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [addToHistory],
  );

  /**
   * Clear terminal history
   */
  const clearHistory = useCallback(() => {
    setState((prev) => ({
      ...prev,
      history: [],
    }));
  }, []);

  /**
   * Update current command input
   */
  const setCurrentCommand = useCallback((command: string) => {
    setState((prev) => ({
      ...prev,
      currentCommand: command,
      currentHistoryIndex: -1,
    }));
  }, []);

  /**
   * Navigate command history (up/down arrows)
   */
  const navigateHistory = useCallback((direction: "up" | "down") => {
    setState((prev) => {
      const { commandHistory, currentHistoryIndex } = prev;

      if (commandHistory.length === 0) return prev;

      let newIndex: number;

      if (direction === "up") {
        newIndex =
          currentHistoryIndex === -1
            ? commandHistory.length - 1
            : Math.max(0, currentHistoryIndex - 1);
      } else {
        newIndex =
          currentHistoryIndex === -1
            ? -1
            : currentHistoryIndex + 1 >= commandHistory.length
              ? -1
              : currentHistoryIndex + 1;
      }

      const newCommand = newIndex === -1 ? "" : commandHistory[newIndex];

      return {
        ...prev,
        currentCommand: newCommand,
        currentHistoryIndex: newIndex,
      };
    });
  }, []);

  /**
   * Start a long-running command
   */
  const startRunningCommand = useCallback((command: string) => {
    setState((prev) => ({
      ...prev,
      isCommandRunning: true,
      runningCommand: command,
    }));
  }, []);

  /**
   * Stop/complete a running command
   */
  const stopRunningCommand = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isCommandRunning: false,
      runningCommand: undefined,
    }));
  }, []);

  return {
    state,
    executeCommand,
    clearHistory,
    setCurrentCommand,
    navigateHistory,
    addToHistory,
    startRunningCommand,
    stopRunningCommand,
  };
}
