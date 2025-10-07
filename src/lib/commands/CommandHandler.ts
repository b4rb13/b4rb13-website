import { COMMAND_TEXTS } from "@/lib/constants/commands";
import type { CommandResult } from "@/types/terminal";
import { CommandRegistry } from "./CommandRegistry";
import type { CommandDefinition, ICommandHandler } from "./types";

/**
 * Handles command parsing and execution
 */
export class CommandHandler implements ICommandHandler {
  private registry: CommandRegistry;

  constructor() {
    this.registry = new CommandRegistry();
    this.initializeBuiltInCommands();
  }

  /**
   * Execute a command from user input
   */
  async executeCommand(commandInput: string): Promise<CommandResult> {
    const trimmedInput = commandInput.trim();

    if (!trimmedInput) {
      return {
        output: "",
        type: "text",
      };
    }

    const [commandName, ...args] = trimmedInput.split(" ");
    const command = this.registry.find(commandName);

    if (!command) {
      return {
        output: `${commandName}: ${COMMAND_TEXTS.notFound}`,
        type: "error",
      };
    }

    try {
      return await command.execute(args);
    } catch (error) {
      return {
        output: `Error executing command: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      };
    }
  }

  /**
   * Get all available commands
   */
  getAvailableCommands(): CommandDefinition[] {
    return this.registry.getAvailableCommands();
  }

  /**
   * Register a new command
   */
  registerCommand(command: CommandDefinition): void {
    this.registry.register(command);
  }

  /**
   * Initialize built-in commands
   */
  private initializeBuiltInCommands(): void {
    // Commands will be registered here - placeholder for now
    // This will be implemented when we create individual command files
  }
}
