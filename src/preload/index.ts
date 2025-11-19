import { contextBridge, ipcRenderer } from 'electron';

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
}

export type RecordingState = 'idle' | 'recording' | 'processing' | 'complete' | 'error';

const api = {
  // Audio
  startRecording: () => ipcRenderer.invoke('audio:start'),
  stopRecording: () => ipcRenderer.invoke('audio:stop'),
  getAudioDevices: () => ipcRenderer.invoke('audio:devices'),
  setAudioDevice: (id: number) => ipcRenderer.invoke('audio:set-device', id),

  // Transcription
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (key: string, value: unknown) => ipcRenderer.invoke('config:set', key, value),

  // History
  getHistory: (limit?: number) => ipcRenderer.invoke('history:get', limit),
  searchHistory: (query: string) => ipcRenderer.invoke('history:search', query),
  deleteHistoryItem: (id: number) => ipcRenderer.invoke('history:delete', id),

  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // Clipboard
  copyToClipboard: (text: string) => ipcRenderer.invoke('clipboard:copy', text),

  // Audio level for visualization
  onAudioLevel: (callback: (level: number) => void) => {
    const handler = (_: unknown, level: number) => callback(level);
    ipcRenderer.on('audio:level', handler);
    return () => ipcRenderer.removeListener('audio:level', handler);
  },

  // Event listeners
  onRecordingState: (callback: (state: RecordingState) => void) => {
    const handler = (_: unknown, state: RecordingState) => callback(state);
    ipcRenderer.on('recording:state', handler);
    return () => ipcRenderer.removeListener('recording:state', handler);
  },

  onTranscriptionResult: (callback: (result: TranscriptionResult) => void) => {
    const handler = (_: unknown, result: TranscriptionResult) => callback(result);
    ipcRenderer.on('transcription:result', handler);
    return () => ipcRenderer.removeListener('transcription:result', handler);
  },

  onHotkeyToggle: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('hotkey:toggle-recording', handler);
    return () => ipcRenderer.removeListener('hotkey:toggle-recording', handler);
  },

  onError: (callback: (error: string) => void) => {
    const handler = (_: unknown, error: string) => callback(error);
    ipcRenderer.on('error', handler);
    return () => ipcRenderer.removeListener('error', handler);
  },
};

contextBridge.exposeInMainWorld('parrot', api);

// Type declaration for renderer
declare global {
  interface Window {
    parrot: typeof api;
  }
}
