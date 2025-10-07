"use client";

/**
 * Terminal window header with control buttons
 */
export function TerminalHeader() {
  return (
    <header className="bg-gray-900 h-8 flex items-center px-4 border-b border-gray-800">
      <div className="flex space-x-2">
        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
      </div>
    </header>
  );
}
