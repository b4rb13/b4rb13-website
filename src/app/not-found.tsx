"use client";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-terminal-green font-mono flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-6xl font-bold">404</div>
        <div className="text-xl">Command not found</div>
        <div className="text-sm opacity-75">
          The page you're looking for doesn't exist in this terminal.
        </div>
        <div className="mt-8">
          <a
            href="/"
            className="inline-block px-6 py-2 border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-black transition-colors duration-200"
          >
            Return to Terminal
          </a>
        </div>
      </div>
    </div>
  );
}
