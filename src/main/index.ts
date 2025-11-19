import { app, BrowserWindow, ipcMain, globalShortcut, clipboard } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
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
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.on('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window:close', () => {
  mainWindow?.close();
});

ipcMain.handle('clipboard:copy', async (_, text: string) => {
  clipboard.writeText(text);
  return true;
});

// Placeholder handlers - implement these with actual services
ipcMain.handle('audio:start', async () => {
  console.log('Starting recording...');
  mainWindow?.webContents.send('recording:state', 'recording');
  return true;
});

ipcMain.handle('audio:stop', async () => {
  console.log('Stopping recording...');
  mainWindow?.webContents.send('recording:state', 'processing');

  // Placeholder - replace with actual transcription
  setTimeout(() => {
    mainWindow?.webContents.send('transcription:result', {
      text: 'This is a placeholder transcription. Implement the actual audio recording and OpenAI API call.',
      language: 'en',
      duration: 1000,
    });
    mainWindow?.webContents.send('recording:state', 'complete');
  }, 1000);

  return true;
});

ipcMain.handle('audio:devices', async () => {
  // Placeholder - implement with naudiodon
  return [{ id: 0, name: 'Default Microphone', isDefault: true }];
});

ipcMain.handle('config:get', async () => {
  // Placeholder - implement with electron-store
  return {
    transcription: {
      service: 'openai',
      openai: { apiKey: '', model: 'whisper-1' },
    },
  };
});

ipcMain.handle('history:get', async (_, limit = 50) => {
  // Placeholder - implement with better-sqlite3
  return [];
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  // Register global shortcut
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    mainWindow?.webContents.send('hotkey:toggle-recording');
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
