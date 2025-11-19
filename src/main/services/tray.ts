import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron';
import path from 'path';

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

  private getIconPath(name: string): string {
    // In development, icons are in resources/icons
    // In production, they'd be in the app's resources
    const isDev = !app.isPackaged;
    if (isDev) {
      return path.join(__dirname, '..', '..', '..', 'resources', 'icons', name);
    }
    return path.join(process.resourcesPath, 'icons', name);
  }

  private createIcon(): Electron.NativeImage {
    const iconName = this.isRecording ? 'tray-recording.png' : 'tray-idle.png';
    const iconPath = this.getIconPath(iconName);
    return nativeImage.createFromPath(iconPath);
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
