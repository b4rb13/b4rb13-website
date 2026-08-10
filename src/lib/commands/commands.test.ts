import { describe, expect, test } from "bun:test";
import { SOCIAL_LINKS } from "@/lib/constants/commands";
import {
  getAutocompleteSuggestion,
  getMatchingCommands,
  getMatchingFlags,
} from "@/lib/utils/autocomplete";
import type { CommandResult } from "@/types/terminal";
import { BUILT_IN_COMMANDS } from "./builtins";
import { CommandHandler } from "./CommandHandler";
import { CommandRegistry } from "./CommandRegistry";

const handler = new CommandHandler();

async function run(input: string): Promise<CommandResult> {
  return (await handler.executeCommand(input)) as CommandResult;
}

describe("CommandRegistry", () => {
  test("finds by name and by alias, case-insensitively", () => {
    const registry = new CommandRegistry();
    registry.register({
      name: "Greet",
      description: "",
      aliases: ["hi"],
      execute: () => ({ output: "hello", type: "text" }),
    });

    expect(registry.find("greet")?.name).toBe("Greet");
    expect(registry.find("GREET")?.name).toBe("Greet");
    expect(registry.find("hi")?.name).toBe("Greet");
    expect(registry.find("nope")).toBeUndefined();
  });

  test("hidden commands are registered but not listed", () => {
    const registry = new CommandRegistry();
    registry.register({
      name: "secret",
      description: "",
      hidden: true,
      execute: () => ({ output: "", type: "text" }),
    });

    expect(registry.find("secret")).toBeDefined();
    expect(registry.getAvailableCommands()).toHaveLength(0);
  });
});

describe("CommandHandler dispatch", () => {
  test("every built-in command is registered", () => {
    const names = handler.getAvailableCommands().map((c) => c.name);
    expect(names.sort()).toEqual(
      [
        "about",
        "clear",
        "connect",
        "help",
        "marvel",
        "mirror",
        "starwars",
      ].sort(),
    );
    expect(BUILT_IN_COMMANDS).toHaveLength(7);
  });

  test("unknown commands report not found", async () => {
    expect((await run("nope")).type).toBe("error");
    expect((await run("nope")).output).toContain("command not found");
  });

  test("empty input is a no-op", async () => {
    expect(await run("   ")).toEqual({ output: "", type: "text" });
  });

  test("command names are case-insensitive", async () => {
    expect((await run("HELP")).output).toBe((await run("help")).output);
  });

  test("extra whitespace between tokens is tolerated", async () => {
    const result = await run("connect    --github");
    expect(result.action).toBe("openLink");
  });
});

describe("built-in behaviour is preserved", () => {
  test("clear asks the terminal to clear", async () => {
    expect((await run("clear")).action).toBe("clear");
  });

  test("marvel and starwars carry their audio action", async () => {
    expect(await run("marvel")).toMatchObject({
      type: "ascii",
      action: "playAudio",
      actionData: { audioFile: "marvel" },
      isLongRunning: true,
    });
    expect((await run("starwars")).actionData?.audioFile).toBe("starwars");
  });

  test("connect with no args lists the channels", async () => {
    const result = await run("connect");
    expect(result.type).toBe("text");
    expect(result.output).toContain("--github");
  });

  test("connect opens the matching social link", async () => {
    const result = await run("connect --telegram");
    expect(result.action).toBe("openLink");
    expect(result.actionData?.url).toBe(
      SOCIAL_LINKS.find((l) => l.command.includes("telegram"))?.url,
    );
  });

  test("connect flags are case-insensitive, as before the refactor", async () => {
    expect((await run("connect --GitHub")).action).toBe("openLink");
  });

  test("an unknown connect platform is an error", async () => {
    const result = await run("connect --myspace");
    expect(result.type).toBe("error");
    expect(result.output).toContain("myspace");
  });

  test("mirror defaults to v1 and honours its variants", async () => {
    expect((await run("mirror")).actionData?.variant).toBe("v1");
    expect((await run("mirror --v2")).actionData?.variant).toBe("v2");
    expect((await run("mirror --V3")).actionData?.variant).toBe("v3");
    expect((await run("mirror")).type).toBe("mirror");
  });

  test("an invalid mirror flag is an error", async () => {
    expect((await run("mirror --v9")).type).toBe("error");
  });
});

describe("autocomplete reads the registry", () => {
  test("command names come from the registry", () => {
    expect(getMatchingCommands("m").sort()).toEqual(["marvel", "mirror"]);
    expect(getMatchingCommands("hel")).toEqual(["help"]);
    expect(getMatchingCommands("")).toEqual([]);
  });

  test("connect flags match the social links that actually exist", () => {
    const flags = getMatchingFlags("connect", "");
    expect(flags).toEqual(["--github", "--telegram", "--linkedin"]);
  });

  test("it no longer offers --twitter, which had no social link", () => {
    // Regression: the old hardcoded list advertised --twitter while the
    // SOCIAL_LINKS entry was commented out, so completing it then running it
    // produced "Platform not found".
    expect(getMatchingFlags("connect", "--t")).toEqual(["--telegram"]);
    expect(getMatchingFlags("connect", "")).not.toContain("--twitter");
  });

  test("mirror flags come from the mirror command", () => {
    expect(getMatchingFlags("mirror", "")).toEqual(["--v1", "--v2", "--v3"]);
  });

  test("a command with no flags offers nothing", () => {
    expect(getMatchingFlags("help", "")).toEqual([]);
    expect(getAutocompleteSuggestion("help ").type).toBe("none");
  });

  test("a trailing space lists a command's flags", () => {
    // Regression: `parseCommandInput` tested `trimmed.endsWith(" ")`, which is
    // never true, so this branch was dead and `connect ` + Tab re-completed
    // the command name instead of offering flags.
    expect(getAutocompleteSuggestion("connect ")).toMatchObject({
      type: "multiple",
      suggestions: ["--github", "--telegram", "--linkedin"],
      context: "connect-flag",
    });
  });

  test("a single match completes, several show suggestions", () => {
    expect(getAutocompleteSuggestion("hel")).toEqual({
      type: "complete",
      completion: "help",
      context: "command",
    });
    expect(getAutocompleteSuggestion("m")).toMatchObject({
      type: "multiple",
      context: "command",
    });
  });

  test("flag context is preserved for the suggestion bar", () => {
    expect(getAutocompleteSuggestion("connect --g").context).toBe(
      "connect-flag",
    );
    expect(getAutocompleteSuggestion("mirror --v").context).toBe("mirror-flag");
  });
});
