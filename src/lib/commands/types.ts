import type { Command, CommandResult } from "@/types/terminal";

// Command-specific types
export type CommandName =
  | "help"
  | "about"
  // | "resume"
  | "connect"
  | "clear"
  | "marvel"
  | "starwars";

export interface CommandDefinition extends Command {
  category?: "general" | "social" | "fun" | "info";
  hidden?: boolean;
  requiresArgs?: boolean;
}

// Social connect command types
export interface ConnectCommandArgs {
  platform?: string;
}

// Command handler interface
export interface ICommandHandler {
  executeCommand(commandInput: string): Promise<CommandResult>;
  getAvailableCommands(): CommandDefinition[];
  registerCommand(command: CommandDefinition): void;
}

// Command registry interface
export interface ICommandRegistry {
  register(command: CommandDefinition): void;
  get(name: string): CommandDefinition | undefined;
  getAll(): CommandDefinition[];
  find(nameOrAlias: string): CommandDefinition | undefined;
}
