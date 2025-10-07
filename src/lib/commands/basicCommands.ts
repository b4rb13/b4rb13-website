import { ASCII_ART } from "@/lib/constants/ascii-art";
import { COMMAND_TEXTS, SOCIAL_LINKS } from "@/lib/constants/commands";
import type { CommandResult } from "@/types/terminal";

/**
 * Execute basic terminal commands
 * This is a simplified implementation that will be replaced by the full command system
 */
export async function executeBasicCommand(
  commandInput: string,
): Promise<CommandResult> {
  const [command, ...args] = commandInput.toLowerCase().split(" ");

  switch (command) {
    case "help":
      return {
        output: COMMAND_TEXTS.help,
        type: "text",
      };

    case "about":
      return {
        output: COMMAND_TEXTS.about,
        type: "text",
      };

    case "connect": {
      if (args.length === 0) {
        return {
          output: COMMAND_TEXTS.contact,
          type: "text",
        };
      }

      // Handle connect with specific platform
      const platform = args[0].replace("--", "");
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
    }

    // case "resume":
    //   return {
    //     output: COMMAND_TEXTS.resume,
    //     type: "text",
    //   };

    case "clear":
      return {
        output: "",
        type: "text",
        action: "clear",
      };

    case "marvel":
      return {
        output: ASCII_ART.marvel,
        type: "ascii",
        action: "playAudio",
        actionData: { audioFile: "marvel" },
        isLongRunning: true,
      };

    case "starwars":
      return {
        output: ASCII_ART.starwars,
        type: "ascii",
        action: "playAudio",
        actionData: { audioFile: "starwars" },
        isLongRunning: true,
      };

    case "mirror": {
      // Parse mirror flags
      const parts = commandInput.toLowerCase().trim().split(/\s+/);
      const flags = parts.slice(1);

      // Default to v1 if no flag provided
      let variant = "v1";

      // Check for valid flags
      const validFlags = ["--v1", "--v2", "--v3"];
      const providedFlag = flags.find((flag) => validFlags.includes(flag));

      if (providedFlag) {
        variant = providedFlag.replace("--", "");
      } else if (flags.length > 0) {
        // Invalid flag provided
        return {
          output: `Invalid flag for mirror command. Available options: --v1, --v2, --v3`,
          type: "error",
        };
      }

      return {
        output: "",
        type: "mirror",
        action: "mirror",
        actionData: {
          variant,
        },
      };
    }

    default:
      return {
        output: `${command}: ${COMMAND_TEXTS.notFound}`,
        type: "error",
      };
  }
}
