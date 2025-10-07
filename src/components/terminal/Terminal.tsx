"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useTerminal } from "@/hooks/useTerminal";
import { CommandLine } from "./CommandLine";
import { CommandOutput } from "./CommandOutput";
import { CommandSuggestions } from "./CommandSuggestions";
import { MirrorIcon } from "./MirrorIcon";
import { SpeakerIcon } from "./SpeakerIcon";
import { TerminalWindow } from "./TerminalWindow";

/**
 * Main Terminal component that orchestrates all terminal functionality
 */
export function Terminal() {
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionContext, setSuggestionContext] = useState<
    "command" | "connect-flag" | "mirror-flag"
  >("command");

  // Simple global state for long-running commands
  const [isCommandRunning, setIsCommandRunning] = useState(false);
  const [runningCommand, setRunningCommand] = useState<string>("");
  const [runningCommandType, setRunningCommandType] = useState<
    "audio" | "mirror" | null
  >(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentMirrorRef = useRef<{ stop: () => void } | null>(null);

  // Track if there's currently an active mirror session
  const [isMirrorSessionActive, setIsMirrorSessionActive] = useState(false);

  const {
    state,
    executeCommand,
    setCurrentCommand,
    navigateHistory,
    clearHistory,
    addToHistory,
  } = useTerminal();

  // Audio hooks (currently unused but may be needed for future features)
  // const { playSound, stopAudio } = useAudio();

  const scrollToBottom = useCallback((retries = 3) => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const scrollToEnd = () => {
      // Use scrollTop + a small buffer to ensure we reach the absolute bottom
      container.scrollTop = container.scrollHeight + 100;
    };

    // Immediate scroll
    scrollToEnd();

    // Use requestAnimationFrame for better timing with DOM updates
    requestAnimationFrame(() => {
      scrollToEnd();

      // Additional retry mechanism for complex content like mirror components
      if (retries > 0) {
        setTimeout(() => {
          scrollToBottom(retries - 1);
        }, 50);
      }
    });
  }, []);

  const startLongRunningCommand = (commandName: string, audioSrc: string) => {
    setIsCommandRunning(true);
    setRunningCommand(commandName);
    setRunningCommandType("audio");

    // Create and play audio
    const audio = new Audio(audioSrc);
    currentAudioRef.current = audio;

    audio.onended = () => {
      setIsCommandRunning(false);
      setRunningCommand("");
      setRunningCommandType(null);
      currentAudioRef.current = null;
    };

    audio.onerror = () => {
      console.warn("Audio failed to play:", audioSrc);
      setIsCommandRunning(false);
      setRunningCommand("");
      setRunningCommandType(null);
      currentAudioRef.current = null;
    };

    audio.play().catch((error) => {
      console.warn("Audio playback failed:", error);
      setIsCommandRunning(false);
      setRunningCommand("");
      setRunningCommandType(null);
      currentAudioRef.current = null;
    });
  };

  const startMirrorCommand = (commandName: string) => {
    setIsCommandRunning(true);
    setRunningCommand(commandName);
    setRunningCommandType("mirror");
    setIsMirrorSessionActive(true);

    // Mirror cleanup will be handled by the MirrorComponent's cleanup function
    // We store a reference to stop the mirror session
    currentMirrorRef.current = {
      stop: () => {
        setIsCommandRunning(false);
        setRunningCommand("");
        setRunningCommandType(null);
        setIsMirrorSessionActive(false);
        currentMirrorRef.current = null;
        // Dispatch event to notify mirror component to cleanup
        window.dispatchEvent(new CustomEvent("mirror-stop"));
      },
    };
  };

  const stopLongRunningCommand = () => {
    // Handle audio cleanup
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }

    // Handle mirror cleanup
    if (currentMirrorRef.current) {
      currentMirrorRef.current.stop();
      return; // stop() already handles state reset
    }

    // Reset state
    setIsCommandRunning(false);
    setRunningCommand("");
    setRunningCommandType(null);
    setIsMirrorSessionActive(false);
  };

  const handleExecuteCommand = async (command: string) => {
    // Stop any currently running command/music before executing any command
    if (isCommandRunning) {
      stopLongRunningCommand();
    }

    // Hide suggestions when executing command
    setShowSuggestions(false);
    setSuggestions([]);

    await executeCommand(command);

    // Auto-scroll to bottom after command execution with improved timing
    scrollToBottom();

    // Handle audio commands based on the result
    const trimmedCommand = command.toLowerCase().trim();
    if (trimmedCommand === "marvel") {
      setTimeout(() => startLongRunningCommand("marvel", "/audio/av.mp3"), 100);
    } else if (trimmedCommand === "starwars") {
      setTimeout(
        () => startLongRunningCommand("starwars", "/audio/sw.mp3"),
        100
      );
    }

    // Handle mirror commands
    if (trimmedCommand.startsWith("mirror")) {
      const variant = trimmedCommand.includes("--v2")
        ? "v2"
        : trimmedCommand.includes("--v3")
        ? "v3"
        : "v1";

      setTimeout(() => startMirrorCommand(`mirror ${variant}`), 100);
    }
  };

  const handleCancelCommand = (command: string) => {
    // If a command is running, terminate it
    if (isCommandRunning) {
      stopLongRunningCommand();

      // Add the running command with cancellation to history
      if (runningCommand) {
        const cancelledResult = {
          output: "",
          type: "cancelled" as const,
        };
        addToHistory(runningCommand, cancelledResult);
      }
    } else if (command.trim()) {
      // Normal cancellation of typed but not executed command
      const cancelledResult = {
        output: "",
        type: "cancelled" as const,
      };

      addToHistory(command, cancelledResult);
    }

    // Auto-scroll to bottom after adding cancelled command
    scrollToBottom();

    // Clear the input
    setCurrentCommand("");

    // Hide suggestions
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSuggestionsChange = (
    newSuggestions: string[],
    visible: boolean,
    context: "command" | "connect-flag" | "mirror-flag" = "command"
  ) => {
    setSuggestions(newSuggestions);
    setShowSuggestions(visible);
    setSuggestionContext(context);
  };

  const handleFocusInput = () => {
    inputRef.current?.focus();
  };

  const handleExecuteHelp = () => {
    handleExecuteCommand("help");
  };

  // Set up keyboard shortcuts
  useKeyboardShortcuts({
    onClear: clearHistory,
    onFocusInput: handleFocusInput,
    onExecuteHelp: handleExecuteHelp,
  });

  // Listen for mirror component loading to trigger additional scrolling
  useEffect(() => {
    const handleMirrorLoaded = () => {
      scrollToBottom();
    };

    window.addEventListener("mirror-loaded", handleMirrorLoaded);
    return () =>
      window.removeEventListener("mirror-loaded", handleMirrorLoaded);
  }, [scrollToBottom]);

  return (
    <div className="h-screen w-screen bg-black p-1">
      <TerminalWindow className="w-full h-full">
        {/* Terminal content and input area - sticky layout */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-terminal-green/30 scrollbar-track-transparent flex flex-col"
        >
          <div className="">
            <CommandOutput
              history={state.history}
              helpText={
                state.history.length === 0
                  ? 'Type "help" for the list of all commands'
                  : undefined
              }
              isMirrorSessionActive={isMirrorSessionActive}
            />
          </div>

          {/* Command input area - sticky to bottom */}
          <div className="border-t border-gray-800 bg-black flex-shrink-0 sticky bottom-0">
            {isCommandRunning ? (
              runningCommandType === "mirror" ? (
                <MirrorIcon
                  runningCommand={runningCommand ?? "mirror"}
                  onCancelCommand={() => handleCancelCommand("")}
                />
              ) : (
                <SpeakerIcon
                  runningCommand={runningCommand ?? "audio"}
                  onCancelCommand={() => handleCancelCommand("")}
                />
              )
            ) : (
              <>
                <CommandLine
                  ref={inputRef}
                  onExecuteCommand={handleExecuteCommand}
                  onCancelCommand={handleCancelCommand}
                  onNavigateHistory={navigateHistory}
                  currentCommand={state.currentCommand}
                  onCommandChange={setCurrentCommand}
                  isLoading={state.isLoading}
                  onSuggestionsChange={handleSuggestionsChange}
                />
                <CommandSuggestions
                  suggestions={suggestions}
                  isVisible={showSuggestions}
                  context={suggestionContext}
                />
              </>
            )}
          </div>
        </div>
      </TerminalWindow>
    </div>
  );
}
