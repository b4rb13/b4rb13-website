import { COMMAND_TEXTS } from "@/lib/constants/commands";
import type { CommandOutcome } from "@/types/terminal";
import { BUILT_IN_COMMANDS } from "./builtins";
import { CommandRegistry } from "./CommandRegistry";
import type { CommandDefinition, ICommandHandler } from "./types";

/**
 * Parses input and dispatches to the registry.
 *
 * Returns the command's raw outcome — a result or a session — so the caller
 * decides how to drive it. Nothing here inspects the command string beyond
 * splitting it, and nothing downstream re-parses it.
 */
export class CommandHandler implements ICommandHandler {
  private registry: CommandRegistry;

  constructor(commands: CommandDefinition[] = BUILT_IN_COMMANDS) {
    this.registry = new CommandRegistry();
    for (const command of commands) {
      this.registry.register(command);
    }
  }

  async executeCommand(commandInput: string): Promise<CommandOutcome> {
    const trimmedInput = commandInput.trim();

    if (!trimmedInput) {
      return { output: "", type: "text" };
    }

    const [commandName, ...args] = trimmedInput.split(/\s+/);
    const command = this.registry.find(commandName);

    if (!command) {
      return {
        output: `${commandName}: ${COMMAND_TEXTS.notFound}`,
        type: "error",
      };
    }

    // Commands were case-insensitive by name only; arguments keep their case
    // so a session can echo what the visitor actually typed.
    return command.execute(args);
  }

  getAvailableCommands(): CommandDefinition[] {
    return this.registry.getAvailableCommands();
  }

  registerCommand(command: CommandDefinition): void {
    this.registry.register(command);
  }

  getRegistry(): CommandRegistry {
    return this.registry;
  }
}
