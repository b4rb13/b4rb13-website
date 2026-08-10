// Core terminal types and interfaces

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

/**
 * One turn a session asks the terminal to take.
 *
 * `ask` and `confirm` suspend until the visitor answers; `status` does not —
 * the terminal renders it and immediately resumes the generator, which is
 * what lets a command show "sending…" while it awaits real work.
 */
export type SessionStep =
  | {
      kind: "ask";
      key: string;
      label: string;
      /** Enter inserts a newline; the driver decides how the step ends. */
      multiline?: boolean;
      /** Per-step completions. Empty/absent means Tab is inert. */
      completions?: string[];
      /** Returns a problem to show, or null when the value is acceptable. */
      validate?: (value: string) => string | null;
    }
  | { kind: "confirm"; label: string; preview: string }
  | { kind: "status"; text: string };

/**
 * A multi-turn command. Session state lives in the generator's own closure,
 * so nothing has to be lifted into terminal state.
 *
 * Yields a step, receives the answer, and finally returns the CommandResult
 * that lands in history. `CommandResult` deliberately has no "not finished"
 * variant — the terminal tells a session from a plain result by what
 * `execute` returned.
 */
export type CommandSession = AsyncGenerator<
  SessionStep,
  CommandResult,
  string | boolean
>;

export type CommandOutcome =
  | CommandResult
  | Promise<CommandResult>
  | CommandSession;

export interface Command {
  name: string;
  description: string;
  execute: (args: string[]) => CommandOutcome;
  aliases?: string[];
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
