import { app } from 'electron';
import path from 'path';
import { exec } from 'child_process';

export type SoundType = 'start' | 'stop' | 'complete';

export class SoundManager {
  private enabled = true;
  private soundsPath: string;

  constructor() {
    const isDev = !app.isPackaged;
    if (isDev) {
      this.soundsPath = path.join(__dirname, '..', '..', '..', 'resources', 'sounds');
    } else {
      this.soundsPath = path.join(process.resourcesPath, 'sounds');
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  play(sound: SoundType): void {
    if (!this.enabled) return;

    const soundFile = path.join(this.soundsPath, `${sound}.wav`);

    // Use platform-specific audio player
    // Linux: aplay, paplay, or ffplay
    // macOS: afplay
    // Windows: would use powershell

    const platform = process.platform;
    let command: string;

    if (platform === 'darwin') {
      command = `afplay "${soundFile}"`;
    } else if (platform === 'linux') {
      // Try paplay first (PulseAudio), fallback to aplay
      command = `paplay "${soundFile}" 2>/dev/null || aplay "${soundFile}" 2>/dev/null`;
    } else {
      // Windows
      command = `powershell -c (New-Object Media.SoundPlayer "${soundFile}").PlaySync()`;
    }

    exec(command, (error) => {
      if (error) {
        console.warn(`Failed to play sound ${sound}:`, error.message);
      }
    });
  }

  playStart(): void {
    this.play('start');
  }

  playStop(): void {
    this.play('stop');
  }

  playComplete(): void {
    this.play('complete');
  }
}
