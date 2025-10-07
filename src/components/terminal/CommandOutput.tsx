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
    const baseClasses =
      "whitespace-pre-wrap break-words font-mono text-xs sm:text-sm leading-relaxed";

    switch (type) {
      case "error":
        return (
          <div
            className={`${baseClasses} text-terminal-red`}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Required for terminal output formatting
            dangerouslySetInnerHTML={{ __html: output }}
          />
        );
      case "ascii":
        return (
          <div
            className={`${baseClasses} text-terminal-green text-[8px] sm:text-xs overflow-x-auto whitespace-pre font-mono`}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Required for ASCII art rendering
            dangerouslySetInnerHTML={{ __html: output }}
          />
        );
      case "link":
        return (
          <div
            className={`${baseClasses} text-terminal-blue`}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Required for link formatting
            dangerouslySetInnerHTML={{ __html: output }}
          />
        );
      case "cancelled":
        return (
          <div className={`${baseClasses} text-terminal-green/60`}>^C</div>
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
          <div
            className={`${baseClasses} text-terminal-green`}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Required for terminal output formatting
            dangerouslySetInnerHTML={{ __html: output }}
          />
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
