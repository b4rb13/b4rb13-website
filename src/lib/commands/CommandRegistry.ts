import type { CommandDefinition, ICommandRegistry } from "./types";

/**
 * Central registry for managing terminal commands
 */
export class CommandRegistry implements ICommandRegistry {
  private commands = new Map<string, CommandDefinition>();
  private aliases = new Map<string, string>();

  /**
   * Register a new command in the registry
   */
  register(command: CommandDefinition): void {
    this.commands.set(command.name.toLowerCase(), command);

    // Register aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.set(alias.toLowerCase(), command.name.toLowerCase());
      }
    }
  }

  /**
   * Get a command by name
   */
  get(name: string): CommandDefinition | undefined {
    return this.commands.get(name.toLowerCase());
  }

  /**
   * Get all registered commands
   */
  getAll(): CommandDefinition[] {
    return Array.from(this.commands.values());
  }

  /**
   * Find a command by name or alias
   */
  find(nameOrAlias: string): CommandDefinition | undefined {
    const lowerName = nameOrAlias.toLowerCase();

    // Try direct lookup first
    const command = this.commands.get(lowerName);
    if (command) return command;

    // Try alias lookup
    const aliasTarget = this.aliases.get(lowerName);
    if (aliasTarget) {
      return this.commands.get(aliasTarget);
    }

    return undefined;
  }

  /**
   * Get all available commands (excluding hidden ones)
   */
  getAvailableCommands(): CommandDefinition[] {
    return this.getAll().filter((cmd) => !cmd.hidden);
  }

  /**
   * Clear all registered commands
   */
  clear(): void {
    this.commands.clear();
    this.aliases.clear();
  }
}
