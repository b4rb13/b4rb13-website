"use client";

import { useCallback, useEffect, useRef } from "react";
import { AudioManager } from "@/lib/audio/AudioManager";
import type { AudioFile } from "@/types/terminal";

/**
 * Hook for managing audio functionality in the terminal
 */
export function useAudio(
  audioFiles: AudioFile[] = [],
  onAudioStart?: (name: string) => void,
  onAudioEnd?: (name: string) => void,
) {
  const audioManagerRef = useRef<AudioManager | null>(null);

  // Initialize audio manager
  useEffect(() => {
    audioManagerRef.current = new AudioManager();

    // Set up audio event callbacks
    if (onAudioStart) {
      audioManagerRef.current.onPlay = onAudioStart;
    }
    if (onAudioEnd) {
      audioManagerRef.current.onEnd = onAudioEnd;
    }

    // Preload audio files
    if (audioFiles.length > 0) {
      audioManagerRef.current.preloadAudio(audioFiles).catch((error) => {
        console.warn("Failed to preload some audio files:", error);
      });
    }

    // Cleanup on unmount
    return () => {
      audioManagerRef.current?.clearCache();
    };
  }, [audioFiles, onAudioStart, onAudioEnd]);

  /**
   * Play a sound by name
   */
  const playSound = useCallback(async (soundName: string, src?: string) => {
    if (!audioManagerRef.current) {
      console.warn("Audio manager not initialized");
      return;
    }

    try {
      // Stop any currently playing audio first
      audioManagerRef.current.stop();
      // Small delay to ensure clean audio transition
      await new Promise((resolve) => setTimeout(resolve, 50));
      await audioManagerRef.current.playSound(soundName, src);
    } catch (error) {
      // Graceful fallback for audio issues (common in development)
      console.warn(
        "Audio playback failed (this is normal in some browsers):",
        error,
      );
    }
  }, []);

  /**
   * Stop currently playing audio
   */
  const stopAudio = useCallback(() => {
    audioManagerRef.current?.stop();
  }, []);

  /**
   * Set volume (0-1)
   */
  const setVolume = useCallback((volume: number) => {
    audioManagerRef.current?.setVolume(volume);
  }, []);

  /**
   * Check if audio is playing
   */
  const isPlaying = useCallback(() => {
    return audioManagerRef.current?.isPlaying() ?? false;
  }, []);

  return {
    playSound,
    stopAudio,
    setVolume,
    isPlaying,
  };
}
