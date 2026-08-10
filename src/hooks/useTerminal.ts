"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { CommandHandler } from "@/lib/commands/CommandHandler";
import {
  isCommandSession,
  SessionRunner,
  type SessionSnapshot,
} from "@/lib/commands/session";
import type { CommandResult, TerminalState } from "@/types/terminal";

const EMPTY_SESSION: SessionSnapshot = {
  step: null,
  pending: null,
  error: null,
  answers: [],
  done: false,
};

/**
 * Terminal state and command execution.
 *
 * Executing a command returns its result rather than acting on it — the
 * caller owns every side effect, so `action` is interpreted in exactly one
 * place instead of being re-derived from the raw input string.
 */
export function useTerminal() {
  const handler = useMemo(() => new CommandHandler(), []);

  const [state, setState] = useState<TerminalState>({
    history: [],
    commandHistory: [],
    currentCommand: "",
    isLoading: false,
    currentHistoryIndex: -1,
  });

  // The live session, if a command handed control to one. State belongs to the
  // generator's closure; this holds only the runner and what we render.
  const runnerRef = useRef<SessionRunner | null>(null);
  const [session, setSession] = useState<SessionSnapshot>(EMPTY_SESSION);
  const sessionActive = runnerRef.current !== null;

  /** Record a command for up-arrow recall without showing output. */
  const rememberCommand = useCallback((command: string) => {
    const trimmed = command.trim();
    if (!trimmed) return;
    setState((prev) => ({
      ...prev,
      commandHistory:
        prev.commandHistory[prev.commandHistory.length - 1] !== trimmed
          ? [...prev.commandHistory, trimmed]
          : prev.commandHistory,
      currentHistoryIndex: -1,
    }));
  }, []);

  const addToHistory = useCallback((command: string, result: CommandResult) => {
    setState((prev) => {
      const trimmed = command.trim();
      return {
        ...prev,
        history: [...prev.history, { command, result, timestamp: new Date() }],
        commandHistory:
          trimmed &&
          prev.commandHistory[prev.commandHistory.length - 1] !== trimmed
            ? [...prev.commandHistory, trimmed]
            : prev.commandHistory,
        currentHistoryIndex: -1,
      };
    });
  }, []);

  const endSession = useCallback(
    (command: string, result: CommandResult) => {
      runnerRef.current = null;
      setSession(EMPTY_SESSION);
      addToHistory(command, result);
    },
    [addToHistory],
  );

  /**
   * Run a command. Returns its result, or undefined when the command started
   * an interactive session (whose result lands later, via history).
   */
  const executeCommand = useCallback(
    async (command: string): Promise<CommandResult | undefined> => {
      if (!command.trim()) return;

      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const outcome = await handler.executeCommand(command.trim());

        if (isCommandSession(outcome)) {
          // Answers given inside the session never reach commandHistory — only
          // the command that started it is recallable with up-arrow.
          rememberCommand(command);
          const runner = new SessionRunner(outcome, {
            onChange: setSession,
            onFinish: (result) => endSession(command, result),
          });
          runnerRef.current = runner;
          await runner.start();
          return;
        }

        addToHistory(command, outcome);
        return outcome;
      } catch (error) {
        const errorResult: CommandResult = {
          output: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          type: "error",
        };
        addToHistory(command, errorResult);
        return errorResult;
      } finally {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [handler, addToHistory, rememberCommand, endSession],
  );

  const submitSessionInput = useCallback((value: string) => {
    void runnerRef.current?.submit(value);
  }, []);

  const cancelSession = useCallback(() => {
    if (!runnerRef.current) return false;
    void runnerRef.current.cancel();
    return true;
  }, []);

  const clearHistory = useCallback(() => {
    setState((prev) => ({ ...prev, history: [] }));
  }, []);

  const setCurrentCommand = useCallback((command: string) => {
    setState((prev) => ({
      ...prev,
      currentCommand: command,
      currentHistoryIndex: -1,
    }));
  }, []);

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

  return {
    state,
    availableCommands: handler.getAvailableCommands(),
    executeCommand,
    clearHistory,
    setCurrentCommand,
    navigateHistory,
    addToHistory,
    session,
    sessionActive,
    submitSessionInput,
    cancelSession,
  };
}
