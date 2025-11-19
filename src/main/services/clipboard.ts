import { clipboard } from 'electron';
import robot from 'robotjs';

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
    await this.delay(50);

    // Simulate Ctrl+V using robotjs
    robot.keyTap('v', ['control']);
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
