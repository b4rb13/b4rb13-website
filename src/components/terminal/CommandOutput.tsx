"use client";

import type { HistoryEntry } from "@/types/terminal";
import { MirrorComponent } from "./MirrorComponent";

interface CommandOutputProps {
  history: HistoryEntry[];
  helpText?: string;
  isMirrorSessionActive?: boolean;
}

/**
 * Displays terminal command history and output
 */
export function CommandOutput({
  history,
  helpText,
  isMirrorSessionActive = false,
}: CommandOutputProps) {
  const renderOutput = (
    output: string,
    type: "text" | "ascii" | "error" | "link" | "cancelled" | "mirror",
    variant?: string,
    uniqueId?: string,
  ) => {
    // Whitespace handling is per-type and must NOT live in baseClasses: prose
    // wraps, ASCII art must not. Tailwind emits both utilities at equal
    // specificity, so a branch appending `whitespace-pre` to a base that
    // already has `whitespace-pre-wrap` silently loses to source order.
    const baseClasses = "font-mono text-xs sm:text-sm leading-relaxed";
    const proseClasses = `${baseClasses} whitespace-pre-wrap break-words`;

    // Output is rendered as text, never as HTML. Commands interpolate user
    // input into these strings (e.g. the "command not found" message), so
    // treating it as markup would be an XSS sink. React escapes JSX children.
    switch (type) {
      case "error":
        return (
          <div className={`${proseClasses} text-terminal-red`}>{output}</div>
        );
      case "ascii":
        return (
          <div
            className={`${baseClasses} text-terminal-green text-[8px] sm:text-xs overflow-x-auto whitespace-pre`}
          >
            {output}
          </div>
        );
      case "link":
        return (
          <div className={`${proseClasses} text-terminal-blue`}>{output}</div>
        );
      case "cancelled":
        return (
          <div className={`${proseClasses} text-terminal-green/60`}>^C</div>
        );
      case "mirror":
        return (
          <MirrorComponent
            key={`mirror-${uniqueId || "default"}`}
            variant={(variant as "v1" | "v2" | "v3") || "v1"}
            onError={(error) => console.error("Mirror error:", error)}
          />
        );
      default:
        return (
          <div className={`${proseClasses} text-terminal-green`}>{output}</div>
        );
    }
  };

  // Find the index of the most recent mirror command
  const lastMirrorIndex = isMirrorSessionActive
    ? (() => {
        for (let i = history.length - 1; i >= 0; i--) {
          if (history[i].result.type === "mirror") {
            return i;
          }
        }
        return -1;
      })()
    : -1;

  return (
    <div className="p-4">
      {/* Help text */}
      {helpText && history.length === 0 && (
        <div className="mb-6 animate-pulse">
          <pre className="text-terminal-green font-mono text-xs sm:text-sm opacity-75 leading-relaxed">
            {helpText}
          </pre>
        </div>
      )}

      {/* Command history */}
      <div className="space-y-4">
        {history.map((entry, index) => {
          const isMirrorCommand = entry.result.type === "mirror";
          const isLatestActiveMirror =
            isMirrorCommand &&
            index === lastMirrorIndex &&
            isMirrorSessionActive;

          // Show output for non-mirror commands or only the latest active mirror command
          const shouldShowOutput = !isMirrorCommand
            ? entry.result.output || entry.result.type === "cancelled"
            : isLatestActiveMirror;

          return (
            <div
              key={`${index}-${entry.timestamp.getTime()}`}
              className="group"
            >
              {/* Command prompt */}
              <div className="text-terminal-green font-mono text-xs sm:text-sm flex items-center mb-2">
                <span className="select-none text-terminal-yellow mr-2">
                  &gt;
                </span>
                <span className="text-terminal-green">{entry.command}</span>
              </div>

              {/* Command output */}
              {shouldShowOutput && (
                <div className="ml-4 border-l-2 border-terminal-green/20 pl-4">
                  {renderOutput(
                    entry.result.output,
                    entry.result.type,
                    entry.result.actionData?.variant,
                    entry.timestamp.getTime().toString(),
                  )}
                </div>
              )}

              {/* Show stopped message for inactive mirror commands */}
              {isMirrorCommand && !isLatestActiveMirror && (
                <div className="ml-4 border-l-2 border-terminal-green/20 pl-4">
                  <div className="text-terminal-green/60 font-mono text-xs">
                    Mirror session stopped
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
