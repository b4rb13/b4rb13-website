import type { Command, CommandOutcome } from "@/types/terminal";

export interface CommandDefinition extends Command {
  category?: "general" | "social" | "fun" | "info";
  hidden?: boolean;
  /**
   * Flags this command accepts, used for Tab completion. The registry is the
   * single source — autocomplete reads this rather than keeping its own list.
   */
  flags?: string[];
}

export interface ICommandHandler {
  executeCommand(commandInput: string): Promise<CommandOutcome>;
  getAvailableCommands(): CommandDefinition[];
  registerCommand(command: CommandDefinition): void;
}

export interface ICommandRegistry {
  register(command: CommandDefinition): void;
  get(name: string): CommandDefinition | undefined;
  getAll(): CommandDefinition[];
  find(nameOrAlias: string): CommandDefinition | undefined;
}
