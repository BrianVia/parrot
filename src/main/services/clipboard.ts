import { clipboard } from 'electron';
import { exec } from 'child_process';

export class ClipboardManager {
  private previousContent: string = '';

  /**
   * Copy text to clipboard
   */
  copy(text: string): void {
    // Save previous content for potential restoration
    this.previousContent = clipboard.readText();
    clipboard.writeText(text);
  }

  /**
   * Simulate Ctrl+V to paste clipboard content
   */
  async paste(): Promise<void> {
    // Small delay to ensure clipboard is ready
    await this.delay(100);

    const platform = process.platform;

    if (platform === 'linux') {
      // Use xdotool on Linux
      return new Promise((resolve, reject) => {
        exec('xdotool key ctrl+v', (error) => {
          if (error) {
            console.warn('Failed to paste with xdotool:', error.message);
            console.warn('Install xdotool: sudo apt install xdotool');
            reject(error);
          } else {
            resolve();
          }
        });
      });
    } else if (platform === 'darwin') {
      // Use osascript on macOS
      return new Promise((resolve, reject) => {
        exec('osascript -e \'tell application "System Events" to keystroke "v" using command down\'', (error) => {
          if (error) {
            console.warn('Failed to paste on macOS:', error.message);
            reject(error);
          } else {
            resolve();
          }
        });
      });
    } else {
      // Windows - use PowerShell
      return new Promise((resolve, reject) => {
        exec('powershell -command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys(\'^v\')"', (error) => {
          if (error) {
            console.warn('Failed to paste on Windows:', error.message);
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }
  }

  /**
   * Copy text and immediately paste it
   */
  async copyAndPaste(text: string): Promise<void> {
    this.copy(text);
    await this.paste();
  }

  /**
   * Restore the previous clipboard content
   */
  restorePrevious(): void {
    if (this.previousContent) {
      clipboard.writeText(this.previousContent);
      this.previousContent = '';
    }
  }

  /**
   * Read current clipboard text
   */
  read(): string {
    return clipboard.readText();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
