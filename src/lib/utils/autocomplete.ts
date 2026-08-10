/**
 * Utility functions for command autocompletion.
 *
 * Command names and flags come from the registry — this file used to keep its
 * own copies, which drifted: it offered `--twitter` while that entry was
 * commented out of SOCIAL_LINKS, so completing it produced "Platform not
 * found".
 */

import { BUILT_IN_COMMANDS } from "@/lib/commands/builtins";
import type { CommandDefinition } from "@/lib/commands/types";

function visible(commands: CommandDefinition[]): CommandDefinition[] {
  return commands.filter((command) => !command.hidden);
}

function flagsFor(commands: CommandDefinition[], name: string): string[] {
  const command = commands.find(
    (candidate) => candidate.name.toLowerCase() === name.toLowerCase(),
  );
  return command?.flags ?? [];
}

/**
 * Parse input to determine command and arguments
 */
export function parseCommandInput(input: string): {
  command: string;
  args: string[];
  currentArg: string;
  isCommandComplete: boolean;
} {
  const trimmed = input.trim();
  const parts = trimmed.split(/\s+/);
  // Must test the raw input: `trimmed` can never end in a space, so the
  // original `trimmed.endsWith(" ")` checks below were dead and `connect ` +
  // Tab re-completed the command name instead of listing its flags.
  const endsWithSpace = input.endsWith(" ");

  if (parts.length === 1 && !endsWithSpace) {
    // Still typing the command
    return {
      command: parts[0],
      args: [],
      currentArg: parts[0],
      isCommandComplete: false,
    };
  }

  if (parts.length === 1 && endsWithSpace) {
    // Command is complete, ready for first argument
    return {
      command: parts[0],
      args: [],
      currentArg: "",
      isCommandComplete: true,
    };
  }

  // Command + arguments
  const command = parts[0];
  const args = parts.slice(1, -1);
  const currentArg = parts[parts.length - 1];

  return {
    command,
    args,
    currentArg: endsWithSpace ? "" : currentArg,
    isCommandComplete: true,
  };
}

/**
 * Get commands that match the given prefix
 */
export function getMatchingCommands(
  prefix: string,
  commands: CommandDefinition[] = BUILT_IN_COMMANDS,
): string[] {
  if (!prefix.trim()) {
    return [];
  }

  const lowerPrefix = prefix.toLowerCase().trim();
  return visible(commands)
    .map((command) => command.name)
    .filter((name) => name.toLowerCase().startsWith(lowerPrefix));
}

/**
 * Get matching flags for connect command
 */
export function getMatchingFlags(
  command: string,
  prefix: string,
  commands: CommandDefinition[] = BUILT_IN_COMMANDS,
): string[] {
  const flags = flagsFor(commands, command);
  if (!prefix.trim()) {
    return flags.slice();
  }

  const lowerPrefix = prefix.toLowerCase().trim();
  return flags.filter((flag) => flag.toLowerCase().startsWith(lowerPrefix));
}

/**
 * Get autocomplete suggestion based on current input
 * Returns object with completion type and data
 */
export function getAutocompleteSuggestion(input: string): {
  type: "complete" | "multiple" | "none";
  completion?: string;
  suggestions?: string[];
  context?: "command" | "connect-flag" | "mirror-flag";
} {
  const parsed = parseCommandInput(input);

  if (!parsed.isCommandComplete) {
    // Still typing command name
    const matches = getMatchingCommands(parsed.currentArg);

    if (matches.length === 0) {
      return { type: "none" };
    }

    if (matches.length === 1) {
      return {
        type: "complete",
        completion: matches[0],
        context: "command",
      };
    }

    return {
      type: "multiple",
      suggestions: matches,
      context: "command",
    };
  }

  // Command is complete — offer whatever flags it declares.
  const name = parsed.command.toLowerCase();
  const flagMatches = getMatchingFlags(name, parsed.currentArg);

  if (flagMatches.length > 0) {
    // The suggestion bar styles these two contexts differently; anything else
    // falls back to the generic command styling.
    const context =
      name === "connect"
        ? ("connect-flag" as const)
        : name === "mirror"
          ? ("mirror-flag" as const)
          : ("command" as const);

    if (flagMatches.length === 1) {
      return { type: "complete", completion: flagMatches[0], context };
    }

    return { type: "multiple", suggestions: flagMatches, context };
  }

  // No argument completion for other commands
  return { type: "none" };
}
