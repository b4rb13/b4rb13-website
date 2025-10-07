"use client";

export default function Loading() {
  return (
    <div className="min-h-screen bg-black text-terminal-green font-mono flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-lg">Initializing terminal...</div>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-terminal-green rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-terminal-green rounded-full animate-bounce [animation-delay:0.1s]"></div>
          <div className="w-2 h-2 bg-terminal-green rounded-full animate-bounce [animation-delay:0.2s]"></div>
        </div>
      </div>
    </div>
  );
}
