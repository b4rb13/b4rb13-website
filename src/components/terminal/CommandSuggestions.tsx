interface CommandSuggestionsProps {
  suggestions: string[];
  isVisible: boolean;
  context?: "command" | "connect-flag" | "mirror-flag";
}

/**
 * Display command suggestions below the input field
 */
export function CommandSuggestions({
  suggestions,
  isVisible,
  context = "command",
}: CommandSuggestionsProps) {
  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  const getHeaderText = () => {
    switch (context) {
      case "connect-flag":
        return "Available platforms:";
      case "mirror-flag":
        return "Available variants:";
      default:
        return "Multiple commands found:";
    }
  };

  const getSuggestionDisplay = (suggestion: string) => {
    if (context === "connect-flag") {
      // Remove -- prefix and capitalize for display
      const platform = suggestion.replace("--", "");
      return (
        <div className="flex flex-col">
          <span className="text-terminal-green">{suggestion}</span>
          <span className="text-terminal-green/60 text-[10px] capitalize">
            {platform}
          </span>
        </div>
      );
    }
    if (context === "mirror-flag") {
      // Remove -- prefix and show variant info
      const variant = suggestion.replace("--", "");
      const variantInfo =
        variant === "v1" ? "blocks" : variant === "v2" ? "classic" : "extended";
      return (
        <div className="flex flex-col">
          <span className="text-terminal-green">{suggestion}</span>
          <span className="text-terminal-green/60 text-[10px]">
            {variantInfo}
          </span>
        </div>
      );
    }
    return <span className="text-terminal-green">{suggestion}</span>;
  };

  return (
    <div className="px-3 sm:px-4 py-2 border-t border-gray-800/50">
      <div className="text-terminal-green/70 text-xs mb-2">
        {getHeaderText()}
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion}
            className="font-mono text-xs bg-gray-900/50 px-2 py-1 rounded border border-gray-700/50"
          >
            {getSuggestionDisplay(suggestion)}
          </div>
        ))}
      </div>
    </div>
  );
}
