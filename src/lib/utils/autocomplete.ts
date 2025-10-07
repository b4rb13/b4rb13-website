/**
 * Utility functions for command autocompletion
 */

// Available terminal commands
export const AVAILABLE_COMMANDS = [
  "help",
  "about",
  "connect",
  // "resume",
  "clear",
  "marvel",
  "starwars",
  "mirror",
] as const;

// Available flags for connect command
export const CONNECT_FLAGS = [
  "--github",
  "--telegram",
  "--linkedin",
  "--twitter",
] as const;

// Available flags for mirror command
export const MIRROR_FLAGS = ["--v1", "--v2", "--v3"] as const;

export type AvailableCommand = (typeof AVAILABLE_COMMANDS)[number];
export type ConnectFlag = (typeof CONNECT_FLAGS)[number];
export type MirrorFlag = (typeof MIRROR_FLAGS)[number];

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

  if (parts.length === 1 && !trimmed.endsWith(" ")) {
    // Still typing the command
    return {
      command: parts[0],
      args: [],
      currentArg: parts[0],
      isCommandComplete: false,
    };
  }

  if (parts.length === 1 && trimmed.endsWith(" ")) {
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
    currentArg: trimmed.endsWith(" ") ? "" : currentArg,
    isCommandComplete: true,
  };
}

/**
 * Get commands that match the given prefix
 */
export function getMatchingCommands(prefix: string): string[] {
  if (!prefix.trim()) {
    return [];
  }

  const lowerPrefix = prefix.toLowerCase().trim();
  return AVAILABLE_COMMANDS.filter((command) =>
    command.startsWith(lowerPrefix),
  );
}

/**
 * Get matching flags for connect command
 */
export function getMatchingConnectFlags(prefix: string): string[] {
  if (!prefix.trim()) {
    return CONNECT_FLAGS.slice(); // Return all flags if no prefix
  }

  const lowerPrefix = prefix.toLowerCase().trim();
  return CONNECT_FLAGS.filter((flag) => flag.startsWith(lowerPrefix));
}

/**
 * Get matching flags for mirror command
 */
export function getMatchingMirrorFlags(prefix: string): string[] {
  if (!prefix.trim()) {
    return MIRROR_FLAGS.slice(); // Return all flags if no prefix
  }

  const lowerPrefix = prefix.toLowerCase().trim();
  return MIRROR_FLAGS.filter((flag) => flag.startsWith(lowerPrefix));
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

  // Command is complete, check for argument completion
  if (parsed.command.toLowerCase() === "connect") {
    const flagMatches = getMatchingConnectFlags(parsed.currentArg);

    if (flagMatches.length === 0) {
      return { type: "none" };
    }

    if (flagMatches.length === 1) {
      return {
        type: "complete",
        completion: flagMatches[0],
        context: "connect-flag",
      };
    }

    return {
      type: "multiple",
      suggestions: flagMatches,
      context: "connect-flag",
    };
  }

  if (parsed.command.toLowerCase() === "mirror") {
    const flagMatches = getMatchingMirrorFlags(parsed.currentArg);

    if (flagMatches.length === 0) {
      return { type: "none" };
    }

    if (flagMatches.length === 1) {
      return {
        type: "complete",
        completion: flagMatches[0],
        context: "mirror-flag",
      };
    }

    return {
      type: "multiple",
      suggestions: flagMatches,
      context: "mirror-flag",
    };
  }

  // No argument completion for other commands
  return { type: "none" };
}
