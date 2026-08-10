import { COMMAND_TEXTS } from "@/lib/constants/commands";
import type { CommandOutcome, CommandSession } from "@/types/terminal";
import { BUILT_IN_COMMANDS } from "./builtins";
import { CommandRegistry } from "./CommandRegistry";
import { isCommandSession } from "./session";
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

  /**
   * Re-resolve an input to a *fresh* session, synchronously.
   *
   * Used for back-navigation: generators cannot rewind, so returning to an
   * earlier step means replaying answers into a new session. Returns null when
   * the input does not resolve to a session.
   */
  resolveSession(commandInput: string): CommandSession | null {
    const [commandName, ...args] = commandInput.trim().split(/\s+/);
    const command = this.registry.find(commandName);
    if (!command) return null;

    const outcome = command.execute(args);
    return isCommandSession(outcome) ? outcome : null;
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
