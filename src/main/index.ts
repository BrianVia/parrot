import { app, BrowserWindow, globalShortcut, Notification } from 'electron';
import path from 'path';
import { setupIpcHandlers } from './ipc';
import { AudioService } from './services/audio';
import { TranscriptionManager } from './services/transcription/manager';
import { TranscriptionDatabase } from './services/database';
import { ClipboardManager } from './services/clipboard';
import { TrayManager } from './services/tray';
import { PushToTalkManager } from './services/push-to-talk';
import { getConfig } from './services/config';

// Keep references to prevent garbage collection
let mainWindow: BrowserWindow | null = null;
let trayManager: TrayManager | null = null;
let pushToTalkManager: PushToTalkManager | null = null;

// Services
const audioService = new AudioService();
const transcriptionManager = new TranscriptionManager();
const clipboardManager = new ClipboardManager();
let database: TranscriptionDatabase | null = null;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load app
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  win.on('closed', () => {
    mainWindow = null;
  });

  return win;
}

function registerHotkeys(window: BrowserWindow): void {
  const config = getConfig();

  // Toggle recording hotkey
  const toggleKey = config.hotkeys.toggleRecording;
  const registered = globalShortcut.register(toggleKey, () => {
    window.webContents.send('hotkey:toggle-recording');
  });

  if (!registered) {
    console.error(`Failed to register hotkey: ${toggleKey}`);
  } else {
    console.log(`Registered hotkey: ${toggleKey}`);
  }
}

function setupPushToTalk(window: BrowserWindow): void {
  pushToTalkManager = new PushToTalkManager('RightAlt');

  pushToTalkManager.on('start', () => {
    if (!audioService.getIsRecording()) {
      window.webContents.send('hotkey:toggle-recording');
    }
  });

  pushToTalkManager.on('stop', () => {
    if (audioService.getIsRecording()) {
      window.webContents.send('hotkey:toggle-recording');
    }
  });

  pushToTalkManager.start();
  console.log('Push-to-talk enabled (Right Alt)');
}

// Notification helper - can be used for transcription completion etc.
export function showNotification(title: string, body: string): void {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}

function initializeServices(): void {
  // Initialize database
  database = new TranscriptionDatabase();

  // Load config and configure transcription if API key exists
  const config = getConfig();
  if (config.transcription.openai.apiKey) {
    transcriptionManager.configureOpenAI(
      config.transcription.openai.apiKey,
      config.transcription.openai.model
    );
    console.log('OpenAI transcription service configured');
  } else {
    console.log('OpenAI API key not set - configure in Settings');
  }
}

// App lifecycle
app.whenReady().then(() => {
  // Initialize services first
  initializeServices();

  // Create window
  mainWindow = createWindow();

  // Setup IPC handlers
  if (database) {
    setupIpcHandlers(mainWindow, {
      audio: audioService,
      transcription: transcriptionManager,
      database: database,
      clipboard: clipboardManager,
    });
  }

  // Register global hotkeys
  registerHotkeys(mainWindow);

  // Setup push-to-talk
  setupPushToTalk(mainWindow);

  // Setup system tray
  trayManager = new TrayManager(mainWindow);

  // Update tray when recording state changes
  audioService.on('started', () => {
    trayManager?.setRecording(true);
  });

  audioService.on('stopped', () => {
    trayManager?.setRecording(false);
  });

  audioService.on('cancelled', () => {
    trayManager?.setRecording(false);
  });

  // Close to tray behavior
  const config = getConfig();
  mainWindow.on('close', (event) => {
    if (config.general.closeToTray && mainWindow) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // macOS: Re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
      if (database) {
        setupIpcHandlers(mainWindow, {
          audio: audioService,
          transcription: transcriptionManager,
          database: database,
          clipboard: clipboardManager,
        });
      }
      registerHotkeys(mainWindow);
    } else {
      mainWindow?.show();
    }
  });

  console.log('Parrot started successfully');
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup on quit
app.on('will-quit', () => {
  // Unregister all hotkeys
  globalShortcut.unregisterAll();

  // Stop push-to-talk
  if (pushToTalkManager) {
    pushToTalkManager.stop();
  }

  // Destroy tray
  if (trayManager) {
    trayManager.destroy();
  }

  // Close database
  if (database) {
    database.close();
  }

  console.log('Parrot shutting down');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
