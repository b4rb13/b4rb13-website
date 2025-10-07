import type { AudioFile } from "@/types/terminal";

/**
 * Manages audio playback for terminal commands
 */
export class AudioManager {
  private audioCache = new Map<string, HTMLAudioElement>();
  private currentAudio: HTMLAudioElement | null = null;
  public onPlay?: (soundName: string) => void;
  public onEnd?: (soundName: string) => void;
  private currentSoundName?: string;

  /**
   * Preload audio files
   */
  async preloadAudio(audioFiles: AudioFile[]): Promise<void> {
    const promises = audioFiles
      .filter((file) => file.preload)
      .map((file) => this.loadAudio(file.name, file.src));

    await Promise.allSettled(promises);
  }

  /**
   * Load an audio file into cache
   */
  private async loadAudio(name: string, src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(src);

      audio.addEventListener("canplaythrough", () => {
        this.audioCache.set(name, audio);
        resolve();
      });

      audio.addEventListener("error", () => {
        reject(new Error(`Failed to load audio: ${src}`));
      });

      audio.preload = "auto";
      audio.load();
    });
  }

  /**
   * Play a sound by name
   */
  async playSound(soundName: string, src?: string): Promise<void> {
    // Stop any currently playing audio
    this.stop();

    let audio = this.audioCache.get(soundName);

    // If not cached and src provided, create new audio element
    if (!audio && src) {
      audio = new Audio(src);
      this.audioCache.set(soundName, audio);
    }

    if (!audio) {
      throw new Error(`Audio not found: ${soundName}`);
    }

    // Set up event handlers
    audio.onended = () => {
      this.currentAudio = null;
      this.currentSoundName = undefined;
      this.onEnd?.(soundName);
    };

    try {
      audio.currentTime = 0;
      this.currentAudio = audio;
      this.currentSoundName = soundName;
      await audio.play();
      this.onPlay?.(soundName);
    } catch (error) {
      this.currentAudio = null;
      this.currentSoundName = undefined;
      throw new Error(
        `Failed to play audio: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Stop currently playing audio
   */
  stop(): void {
    if (this.currentAudio && this.currentSoundName) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      const stoppedSoundName = this.currentSoundName;
      this.currentAudio = null;
      this.currentSoundName = undefined;
      this.onEnd?.(stoppedSoundName);
    }
  }

  /**
   * Set volume for all audio (0-1)
   */
  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));

    this.audioCache.forEach((audio) => {
      audio.volume = clampedVolume;
    });
  }

  /**
   * Check if audio is currently playing
   */
  isPlaying(): boolean {
    return this.currentAudio !== null && !this.currentAudio.paused;
  }

  /**
   * Clear audio cache
   */
  clearCache(): void {
    this.stop();
    this.audioCache.clear();
  }
}
