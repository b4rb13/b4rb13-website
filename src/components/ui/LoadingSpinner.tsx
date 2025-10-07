"use client";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Simple loading spinner component
 */
export function LoadingSpinner({
  size = "md",
  className = "",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div
      className={`inline-block animate-spin ${sizeClasses[size]} ${className}`}
    >
      <div className="w-full h-full border-2 border-green-400 border-t-transparent rounded-full"></div>
    </div>
  );
}
