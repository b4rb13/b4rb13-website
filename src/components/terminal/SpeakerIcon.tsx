"use client";

import Lottie from "lottie-react";
import { useEffect } from "react";
import animationData from "@/lib/constants/waves.json";

interface SpeakerIconProps {
  runningCommand?: string;
  onCancelCommand: () => void;
}

/**
 * Speaker icon with audio visualization when command is running
 */
export function SpeakerIcon({
  runningCommand,
  onCancelCommand,
}: SpeakerIconProps) {
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
          <Lottie animationData={animationData} loop={true} className="w-24" />
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
