// Core terminal types and interfaces

export interface Command {
  name: string;
  description: string;
  execute: (args: string[]) => CommandResult;
  aliases?: string[];
}

export interface CommandResult {
  output: string;
  type: "text" | "ascii" | "error" | "link" | "cancelled" | "mirror";
  action?: "openLink" | "playAudio" | "clear" | "mirror";
  actionData?: {
    url?: string;
    audioFile?: string;
    variant?: string;
  };
  isLongRunning?: boolean;
}

export interface HistoryEntry {
  command: string;
  result: CommandResult;
  timestamp: Date;
}

export interface TerminalState {
  history: HistoryEntry[];
  commandHistory: string[];
  currentCommand: string;
  isLoading: boolean;
  currentHistoryIndex: number;
  isCommandRunning: boolean;
  runningCommand?: string;
}

export interface AudioFile {
  name: string;
  src: string;
  preload?: boolean;
}

export interface SocialLink {
  name: string;
  url: string;
  command: string;
}

// Command execution context
export interface CommandContext {
  args: string[];
  fullCommand: string;
  terminal: TerminalState;
}
