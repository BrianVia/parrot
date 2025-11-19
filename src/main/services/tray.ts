import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron';

export class TrayManager {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow;
  private isRecording = false;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.createTray();
  }

  private createTray(): void {
    // Create tray icon - use a simple colored icon for now
    // In production, you'd use actual icon files
    const icon = this.createIcon();

    this.tray = new Tray(icon);
    this.tray.setToolTip('Parrot - Voice to Text');

    this.updateMenu();

    // Click behavior
    this.tray.on('click', () => {
      this.toggleWindow();
    });

    // Double-click to show
    this.tray.on('double-click', () => {
      this.showWindow();
    });
  }

  private createIcon(): Electron.NativeImage {
    // Create a simple 16x16 icon programmatically
    // In production, use actual PNG files from resources/icons/
    const size = 16;
    const canvas = Buffer.alloc(size * size * 4);

    // Fill with a parrot-green color (#10B981)
    for (let i = 0; i < size * size; i++) {
      const offset = i * 4;
      if (this.isRecording) {
        // Red when recording
        canvas[offset] = 239;     // R
        canvas[offset + 1] = 68;  // G
        canvas[offset + 2] = 68;  // B
      } else {
        // Green when idle
        canvas[offset] = 16;      // R
        canvas[offset + 1] = 185; // G
        canvas[offset + 2] = 129; // B
      }
      canvas[offset + 3] = 255;   // A
    }

    return nativeImage.createFromBuffer(canvas, {
      width: size,
      height: size,
    });
  }

  private updateMenu(): void {
    const menu = Menu.buildFromTemplate([
      {
        label: 'Show Parrot',
        click: () => this.showWindow(),
      },
      {
        label: this.isRecording ? 'Stop Recording' : 'Start Recording',
        click: () => {
          this.mainWindow.webContents.send('hotkey:toggle-recording');
        },
      },
      { type: 'separator' },
      {
        label: 'Settings',
        click: () => {
          this.showWindow();
          this.mainWindow.webContents.send('navigate', 'settings');
        },
      },
      { type: 'separator' },
      {
        label: 'Quit Parrot',
        click: () => {
          app.quit();
        },
      },
    ]);

    this.tray?.setContextMenu(menu);
  }

  private toggleWindow(): void {
    if (this.mainWindow.isVisible()) {
      this.mainWindow.hide();
    } else {
      this.showWindow();
    }
  }

  private showWindow(): void {
    this.mainWindow.show();
    this.mainWindow.focus();
  }

  setRecording(recording: boolean): void {
    if (this.isRecording === recording) return;

    this.isRecording = recording;

    // Update icon
    if (this.tray) {
      this.tray.setImage(this.createIcon());
      this.tray.setToolTip(
        recording ? 'Parrot - Recording...' : 'Parrot - Voice to Text'
      );
    }

    // Update menu
    this.updateMenu();
  }

  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}
