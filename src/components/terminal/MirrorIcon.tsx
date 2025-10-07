"use client";

import { useEffect } from "react";

interface MirrorIconProps {
  runningCommand?: string;
  onCancelCommand: () => void;
}

/**
 * Mirror icon with camera visualization when mirror command is running
 */
export function MirrorIcon({
  runningCommand,
  onCancelCommand,
}: MirrorIconProps) {
  // Handle Ctrl+C for cancellation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "c") {
        e.preventDefault();
        onCancelCommand();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancelCommand]);

  return (
    <div className="flex items-center py-2 sm:py-3 px-3 sm:px-4 bg-black border-t border-gray-800">
      <div className="flex items-center space-x-3 h-12 overflow-hidden">
        <div className="relative">
          {/* Camera/Video Icon with blinking animation */}
          <div className="flex items-center justify-center w-24 h-12">
            <div className="relative">
              {/* Camera body */}
              <div className="w-8 h-6 bg-terminal-green rounded-sm relative">
                {/* Lens */}
                <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-terminal-green rounded-full border-2 border-black">
                  <div className="w-2 h-2 bg-black rounded-full mx-auto mt-1"></div>
                </div>
                {/* Recording indicator */}
                <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              </div>

              {/* ASCII art style camera for better terminal feel */}
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-terminal-green text-xs font-mono whitespace-pre">
                {`┌─────┐
│ ◉ ● │ REC
└─────┘`}
              </div>
            </div>
          </div>
        </div>

        {/* Status text */}
        <div className="flex flex-col">
          <span className="text-terminal-green text-xs sm:text-sm font-mono">
            Running: {runningCommand}
          </span>
          <span className="text-terminal-green/60 text-[10px] font-mono">
            Press Ctrl+C to stop
          </span>
        </div>
      </div>
    </div>
  );
}
