"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CommandHandler } from "@/lib/commands/CommandHandler";
import type { CommandDefinition } from "@/lib/commands/types";
import type { CommandResult } from "@/types/terminal";

/**
 * Hook for managing command system integration
 */
export function useCommands() {
  const commandHandlerRef = useRef<CommandHandler | null>(null);
  const [availableCommands, setAvailableCommands] = useState<
    CommandDefinition[]
  >([]);

  // Initialize command handler
  useEffect(() => {
    commandHandlerRef.current = new CommandHandler();
    setAvailableCommands(commandHandlerRef.current.getAvailableCommands());
  }, []);

  /**
   * Execute a command
   */
  const executeCommand = useCallback(
    async (commandInput: string): Promise<CommandResult> => {
      if (!commandHandlerRef.current) {
        return {
          output: "Command system not initialized",
          type: "error",
        };
      }

      try {
        return await commandHandlerRef.current.executeCommand(commandInput);
      } catch (error) {
        return {
          output: `Error executing command: ${error instanceof Error ? error.message : "Unknown error"}`,
          type: "error",
        };
      }
    },
    [],
  );

  /**
   * Register a new command
   */
  const registerCommand = useCallback((command: CommandDefinition) => {
    if (!commandHandlerRef.current) {
      console.warn("Command handler not initialized");
      return;
    }

    commandHandlerRef.current.registerCommand(command);
    setAvailableCommands(commandHandlerRef.current.getAvailableCommands());
  }, []);

  /**
   * Get command suggestions based on input
   */
  const getCommandSuggestions = useCallback(
    (input: string): string[] => {
      const lowerInput = input.toLowerCase();
      return availableCommands
        .filter((cmd) => cmd.name.toLowerCase().startsWith(lowerInput))
        .map((cmd) => cmd.name)
        .slice(0, 5); // Limit to 5 suggestions
    },
    [availableCommands],
  );

  return {
    executeCommand,
    registerCommand,
    getCommandSuggestions,
    availableCommands,
  };
}
