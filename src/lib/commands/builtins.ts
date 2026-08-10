import { ASCII_ART } from "@/lib/constants/ascii-art";
import { COMMAND_TEXTS, SOCIAL_LINKS } from "@/lib/constants/commands";
import type { CommandOutcome, CommandResult } from "@/types/terminal";
import { messageFlow } from "./messageFlow";
import type { CommandDefinition } from "./types";

/**
 * Every command the terminal knows about. This is the single source of truth:
 * the registry dispatches from it, `help` is unrelated prose, and autocomplete
 * derives both command names and flags from it.
 *
 * A command's result carries everything the terminal needs to act — nothing
 * downstream re-parses the raw input.
 */

const MIRROR_VARIANTS = ["--v1", "--v2", "--v3"] as const;

const help: CommandDefinition = {
  name: "help",
  description: "Show all the commands",
  category: "general",
  execute: (): CommandResult => ({ output: COMMAND_TEXTS.help, type: "text" }),
};

const about: CommandDefinition = {
  name: "about",
  description: "Show information about me",
  category: "info",
  execute: (): CommandResult => ({ output: COMMAND_TEXTS.about, type: "text" }),
};

const connect: CommandDefinition = {
  name: "connect",
  description: "Connect with me",
  category: "social",
  // Derived from SOCIAL_LINKS so a commented-out network can never be offered
  // by Tab completion and then rejected on execution. `--message` is appended
  // because it is behaviour rather than a link.
  flags: [
    ...SOCIAL_LINKS.map((link) => `--${link.command.split("--")[1]}`),
    "--message",
  ],
  execute: (args: string[]): CommandOutcome => {
    if (args.length === 0) {
      return { output: COMMAND_TEXTS.contact, type: "text" };
    }

    // The old switch lowercased the whole input, so `--GitHub` worked. Keep
    // that, but only for flag matching — a session must see raw arguments.
    const platform = args[0].toLowerCase().replace("--", "");

    // The one flag that starts a conversation rather than opening a URL.
    if (platform === "message") {
      return messageFlow();
    }
    const socialLink = SOCIAL_LINKS.find((link) =>
      link.command.includes(platform),
    );

    if (socialLink) {
      return {
        output: `Opening ${socialLink.name}...`,
        type: "text",
        action: "openLink",
        actionData: { url: socialLink.url },
      };
    }

    return {
      output: `Platform "${platform}" not found. Type "connect" to see available options.`,
      type: "error",
    };
  },
};

const clear: CommandDefinition = {
  name: "clear",
  description: "Clear the screen",
  category: "general",
  execute: (): CommandResult => ({ output: "", type: "text", action: "clear" }),
};

const marvel: CommandDefinition = {
  name: "marvel",
  description: "Say hello to marvel",
  category: "fun",
  execute: (): CommandResult => ({
    output: ASCII_ART.marvel,
    type: "ascii",
    action: "playAudio",
    actionData: { audioFile: "marvel" },
    isLongRunning: true,
  }),
};

const starwars: CommandDefinition = {
  name: "starwars",
  description: "Say hello to Star Wars",
  category: "fun",
  execute: (): CommandResult => ({
    output: ASCII_ART.starwars,
    type: "ascii",
    action: "playAudio",
    actionData: { audioFile: "starwars" },
    isLongRunning: true,
  }),
};

const mirror: CommandDefinition = {
  name: "mirror",
  description: "ASCII camera mirror with variants (--v1, --v2, --v3)",
  category: "fun",
  flags: [...MIRROR_VARIANTS],
  execute: (args: string[]): CommandResult => {
    const provided = args
      .map((arg) => arg.toLowerCase())
      .find((arg) => (MIRROR_VARIANTS as readonly string[]).includes(arg));

    if (!provided && args.length > 0) {
      return {
        output: `Invalid flag for mirror command. Available options: ${MIRROR_VARIANTS.join(", ")}`,
        type: "error",
      };
    }

    return {
      output: "",
      type: "mirror",
      action: "mirror",
      actionData: { variant: (provided ?? "--v1").replace("--", "") },
    };
  },
};

export const BUILT_IN_COMMANDS: CommandDefinition[] = [
  help,
  about,
  connect,
  clear,
  marvel,
  starwars,
  mirror,
];
