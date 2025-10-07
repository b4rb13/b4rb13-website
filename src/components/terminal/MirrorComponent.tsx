"use client";

import { useEffect, useRef, useState } from "react";

// Declare p5 as global
declare const p5: any;
declare const createDiv: any;
declare const noCanvas: any;
declare const createCapture: any;
declare const VIDEO: any;
declare const floor: any;
declare const map: any;

interface MirrorComponentProps {
  variant: "v1" | "v2" | "v3";
  onError?: (error: string) => void;
}

/**
 * ASCII Art Camera Mirror Component using p5.js
 */
export function MirrorComponent({ variant, onError }: MirrorComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sketchRef = useRef<any>(null);

  // Different density strings for each variant - moved outside useEffect
  const density = (() => {
    switch (variant) {
      case "v1":
        return "        .:░▒▓█";
      case "v2":
        return "       .:-i|=+%O#@";
      case "v3":
        return "Ñ@#W$9876543210?!abc;:+=-,._          ";
      default:
        return "        .:░▒▓█";
    }
  })();

  useEffect(() => {
    // Prevent multiple instances
    if (sketchRef.current) {
      return;
    }

    // Wait for p5.js to be available
    const checkP5 = () => {
      if (typeof window !== "undefined" && (window as any).p5) {
        // Disable Friendly Error System globally to prevent parsing errors
        (window as any).p5.disableFriendlyErrors = true;
        initializeSketch();
      } else {
        setTimeout(checkP5, 100);
      }
    };

    const initializeSketch = () => {
      try {
        let video: any;
        let asciiDiv: any;

        // Use function declaration instead of arrow function to avoid p5.js FES parsing issues
        function sketch(p: any) {
          // biome-ignore lint/complexity/useArrowFunction: Using function declaration for p5.js compatibility
          p.setup = function () {
            if (!containerRef.current) return;

            // Clear any existing content in the container to prevent duplicates
            containerRef.current.innerHTML = "";

            asciiDiv = p.createDiv();
            asciiDiv.parent(containerRef.current);
            asciiDiv.style("font-family", "JetBrains Mono, monospace");
            asciiDiv.style("font-size", "8px");
            asciiDiv.style("line-height", "6px");
            asciiDiv.style("color", "#22c55e");
            asciiDiv.style("white-space", "pre");

            p.noCanvas();

            // biome-ignore lint/complexity/useArrowFunction: Using function declaration for p5.js compatibility
            video = p.createCapture(p.VIDEO, function () {
              setIsLoading(false);
              // Trigger scroll after mirror is loaded
              // biome-ignore lint/complexity/useArrowFunction: Using function declaration for p5.js compatibility
              setTimeout(function () {
                window.dispatchEvent(new CustomEvent("mirror-loaded"));
              }, 100);
            });

            video.size(240, 160); // Smaller size for better performance
            video.hide();

            // Handle video errors
            // biome-ignore lint/complexity/useArrowFunction: Using function declaration for p5.js compatibility
            video.elt.addEventListener("error", function () {
              var errorMsg =
                "Camera access failed. Please allow camera permissions and try again.";
              setError(errorMsg);
              onError?.(errorMsg);
            });
          };

          // biome-ignore lint/complexity/useArrowFunction: Using function declaration for p5.js compatibility
          p.draw = function () {
            if (!video || !asciiDiv) return;

            try {
              video.loadPixels();
              let asciiImage = "";
              let j: number,
                i: number,
                pixelIndex: number,
                r: number,
                g: number,
                b: number,
                avg: number,
                len: number,
                charIndex: number,
                c: string;

              for (j = 0; j < video.height; j++) {
                for (i = 0; i < video.width; i++) {
                  pixelIndex = (i + j * video.width) * 4;
                  r = video.pixels[pixelIndex + 0];
                  g = video.pixels[pixelIndex + 1];
                  b = video.pixels[pixelIndex + 2];
                  avg = (r + g + b) / 3;
                  len = density.length;
                  charIndex = p.floor(p.map(avg, 0, 255, 0, len));
                  c = density.charAt(charIndex);

                  if (c === " ") {
                    asciiImage += "&nbsp;";
                  } else {
                    asciiImage += c;
                  }
                }
                asciiImage += "<br/>";
              }

              asciiDiv.html(asciiImage);
            } catch (err) {
              console.warn("Mirror draw error:", err);
            }
          };
        }

        // Create new p5 instance
        const p5Instance = new (window as any).p5(sketch);

        // Attach cleanup method to the instance for access during unmount
        p5Instance.cleanup = () => {
          try {
            if (video) {
              // Stop all video streams
              if (video.elt?.srcObject) {
                const tracks = video.elt.srcObject.getTracks();
                for (const track of tracks) {
                  track.stop();
                }
              }
              video.remove();
              video = null;
            }
            if (asciiDiv) {
              asciiDiv.remove();
              asciiDiv = null;
            }
          } catch (cleanupErr) {
            console.warn("Error during mirror cleanup:", cleanupErr);
          }
        };

        sketchRef.current = p5Instance;
      } catch (initErr) {
        console.error("Mirror initialization error:", initErr);
        const errorMsg = "Failed to initialize camera mirror.";
        setError(errorMsg);
        onError?.(errorMsg);
      }
    };

    checkP5();

    // Cleanup function
    return () => {
      if (sketchRef.current) {
        try {
          // Call custom cleanup method if available
          if (typeof sketchRef.current.cleanup === "function") {
            sketchRef.current.cleanup();
          }
          // Remove the p5 sketch
          sketchRef.current.remove();
          sketchRef.current = null;
        } catch (err) {
          console.warn("Mirror component cleanup error:", err);
        }
      }
    };
  }, [onError, density]);

  // Listen for mirror-stop event to handle Ctrl+C termination
  useEffect(() => {
    const handleMirrorStop = () => {
      if (sketchRef.current) {
        try {
          // Call custom cleanup method if available
          if (typeof sketchRef.current.cleanup === "function") {
            sketchRef.current.cleanup();
          }
          // Remove the p5 sketch
          sketchRef.current.remove();
          sketchRef.current = null;
        } catch (err) {
          console.warn("Mirror stop cleanup error:", err);
        }
      }
    };

    window.addEventListener("mirror-stop", handleMirrorStop);
    return () => window.removeEventListener("mirror-stop", handleMirrorStop);
  }, []);

  if (error) {
    return (
      <div className="text-terminal-red font-mono text-xs">Error: {error}</div>
    );
  }

  return (
    <div className="font-mono">
      {isLoading && (
        <div className="text-terminal-green text-xs mb-2">
          Initializing camera mirror (variant: {variant})...
        </div>
      )}
      <div
        ref={containerRef}
        className="mirror-container bg-black"
        style={{
          minHeight: isLoading ? "60px" : "auto",
          overflow: "hidden",
        }}
      />
      {!isLoading && !error && (
        <div className="text-terminal-green/60 text-xs mt-2">
          Mirror active - variant: {variant} | Press Ctrl+C to stop
        </div>
      )}
    </div>
  );
}
