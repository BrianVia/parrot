import { ipcMain, BrowserWindow } from 'electron';
import { AudioService } from './services/audio';
import { TranscriptionManager } from './services/transcription/manager';
import { TranscriptionDatabase } from './services/database';
import { ClipboardManager } from './services/clipboard';
import { getConfig, setConfigValue } from './services/config';

interface Services {
  audio: AudioService;
  transcription: TranscriptionManager;
  database: TranscriptionDatabase;
  clipboard: ClipboardManager;
}

export function setupIpcHandlers(
  mainWindow: BrowserWindow,
  services: Services
): void {
  const { audio, transcription, database, clipboard } = services;

  // Keep track of current audio buffer for transcription
  let currentAudioBuffer: Buffer | null = null;

  // Audio handlers
  ipcMain.handle('audio:start', async () => {
    try {
      audio.startRecording();
      mainWindow.webContents.send('recording:state', 'recording');
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start recording';
      mainWindow.webContents.send('error', message);
      return { success: false, error: message };
    }
  });

  ipcMain.handle('audio:stop', async () => {
    try {
      currentAudioBuffer = audio.stopRecording();
      mainWindow.webContents.send('recording:state', 'processing');

      // Check if transcription is configured
      if (!transcription.isConfigured()) {
        const config = getConfig();
        if (config.transcription.openai.apiKey) {
          transcription.configureOpenAI(
            config.transcription.openai.apiKey,
            config.transcription.openai.model
          );
        } else {
          throw new Error('OpenAI API key not configured. Please add it in Settings.');
        }
      }

      // Transcribe
      const config = getConfig();
      const language = config.transcription.language === 'auto' ? undefined : config.transcription.language;
      const result = await transcription.transcribe(currentAudioBuffer, {
        prompt: config.processing.customVocabulary.join(', '),
        language,
      });

      // Save to history
      const serviceName = transcription.getServiceName();
      database.insert(result, serviceName);

      // Handle output
      if (config.output.autoCopy) {
        clipboard.copy(result.text);
      }

      if (config.output.autoPaste) {
        await clipboard.copyAndPaste(result.text);
      }

      // Send result to renderer
      mainWindow.webContents.send('transcription:result', result);
      mainWindow.webContents.send('recording:state', 'complete');

      return { success: true, result };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transcription failed';
      console.error('Transcription error:', error);
      mainWindow.webContents.send('error', message);
      mainWindow.webContents.send('recording:state', 'error');
      return { success: false, error: message };
    }
  });

  ipcMain.handle('audio:cancel', async () => {
    audio.cancelRecording();
    mainWindow.webContents.send('recording:state', 'idle');
    return { success: true };
  });

  ipcMain.handle('audio:devices', async () => {
    return audio.getInputDevices();
  });

  ipcMain.handle('audio:set-device', async (_, deviceId: number) => {
    audio.setDevice(deviceId);
    return { success: true };
  });

  // Audio level forwarding
  audio.on('level', (level: number) => {
    mainWindow.webContents.send('audio:level', level);
  });

  // Config handlers
  ipcMain.handle('config:get', async () => {
    return getConfig();
  });

  ipcMain.handle('config:set', async (_, key: string, value: unknown) => {
    setConfigValue(key, value);

    // Reconfigure services if needed
    if (key === 'transcription.openai.apiKey' || key === 'transcription.openai.model') {
      const config = getConfig();
      if (config.transcription.openai.apiKey) {
        transcription.configureOpenAI(
          config.transcription.openai.apiKey,
          config.transcription.openai.model
        );
      }
    }

    return { success: true };
  });

  // History handlers
  ipcMain.handle('history:get', async (_, limit?: number) => {
    return database.getRecent(limit || 50);
  });

  ipcMain.handle('history:search', async (_, query: string) => {
    return database.search(query);
  });

  ipcMain.handle('history:delete', async (_, id: number) => {
    database.delete(id);
    return { success: true };
  });

  ipcMain.handle('history:clear', async () => {
    database.clear();
    return { success: true };
  });

  // Clipboard handlers
  ipcMain.handle('clipboard:copy', async (_, text: string) => {
    clipboard.copy(text);
    return { success: true };
  });

  ipcMain.handle('clipboard:paste', async () => {
    await clipboard.paste();
    return { success: true };
  });

  // Transcription service handlers
  ipcMain.handle('transcription:get-services', async () => {
    return transcription.getAvailableServices();
  });

  ipcMain.handle('transcription:set-service', async (_, service: string) => {
    transcription.setPrimaryService(service);
    return { success: true };
  });

  // Window handlers
  ipcMain.on('window:minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('window:close', () => {
    mainWindow.close();
  });
}
