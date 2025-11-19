import { autoUpdater } from 'electron-updater';
import { BrowserWindow, dialog } from 'electron';
import log from 'electron-log';

export class AutoUpdater {
  private mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.configure();
  }

  private configure(): void {
    // Configure logging
    log.transports.file.level = 'info';
    autoUpdater.logger = log;

    // Disable auto-download - let user choose
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Event handlers
    autoUpdater.on('checking-for-update', () => {
      log.info('Checking for update...');
      this.sendStatus('Checking for updates...');
    });

    autoUpdater.on('update-available', (info) => {
      log.info('Update available:', info.version);
      this.promptForUpdate(info.version);
    });

    autoUpdater.on('update-not-available', () => {
      log.info('Update not available');
      this.sendStatus('App is up to date');
    });

    autoUpdater.on('download-progress', (progress) => {
      const message = `Downloading: ${Math.round(progress.percent)}%`;
      log.info(message);
      this.sendStatus(message);
    });

    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded:', info.version);
      this.promptToInstall(info.version);
    });

    autoUpdater.on('error', (error) => {
      log.error('Update error:', error);
      this.sendStatus(`Update error: ${error.message}`);
    });
  }

  private sendStatus(message: string): void {
    this.mainWindow.webContents.send('updater:status', message);
  }

  private async promptForUpdate(version: string): Promise<void> {
    const result = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${version}) is available.`,
      detail: 'Would you like to download it now?',
      buttons: ['Download', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  }

  private async promptToInstall(version: string): Promise<void> {
    const result = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: `Version ${version} has been downloaded.`,
      detail: 'The update will be installed when you quit the app. Install now?',
      buttons: ['Install Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  }

  checkForUpdates(): void {
    // Only check in production
    if (process.env.NODE_ENV !== 'development') {
      autoUpdater.checkForUpdates();
    } else {
      log.info('Skipping update check in development');
    }
  }

  downloadUpdate(): void {
    autoUpdater.downloadUpdate();
  }

  quitAndInstall(): void {
    autoUpdater.quitAndInstall();
  }
}
