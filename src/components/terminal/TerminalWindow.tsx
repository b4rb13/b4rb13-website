"use client";

import type { ReactNode } from "react";
import { TerminalHeader } from "./TerminalHeader";

interface TerminalWindowProps {
  children: ReactNode;
  className?: string;
}

/**
 * Main terminal window container with header
 */
export function TerminalWindow({
  children,
  className = "",
}: TerminalWindowProps) {
  return (
    <div
      className={`
      bg-black 
      text-terminal-green 
      font-mono 
      text-xs sm:text-sm 
      border border-gray-800 
      rounded-md
      shadow-2xl
      w-full
      h-full
      flex flex-col
      ${className}
    `}
    >
      <TerminalHeader />
      {children}
    </div>
  );
}
