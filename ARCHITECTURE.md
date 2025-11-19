# VoiceInk Linux - Electron Architecture

A comprehensive architecture plan for building VoiceInk on Linux using Electron.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Why Electron](#why-electron)
3. [Technology Stack](#technology-stack)
4. [System Architecture](#system-architecture)
5. [Audio Subsystem](#audio-subsystem)
6. [Transcription Services](#transcription-services)
7. [User Interface](#user-interface)
8. [System Integration](#system-integration)
9. [Data Persistence](#data-persistence)
10. [Project Structure](#project-structure)
11. [Development Phases](#development-phases)
12. [Build and Distribution](#build-and-distribution)

---

## Executive Summary

This document outlines an Electron-based architecture for VoiceInk on Linux, prioritizing:

- **Rapid development** with familiar web technologies
- **Cross-platform potential** (Linux first, Windows/macOS later)
- **Rich UI** with React and modern component libraries
- **Full feature parity** with the macOS version

Trade-off: Higher memory footprint (~150MB base) in exchange for faster time-to-market.

---

## Why Electron

### Advantages for This Project

1. **Faster Development**
   - TypeScript/JavaScript ecosystem
   - Hot reload during development
   - Vast npm package ecosystem

2. **Proven Solutions**
   - `globalShortcut` for hotkeys (built-in)
   - `Tray` for system tray (built-in)
   - `clipboard` for clipboard access (built-in)
   - `robotjs` or `nut-js` for synthetic input

3. **UI Flexibility**
   - React/Vue/Svelte - whatever you prefer
   - Tailwind, shadcn/ui, or any CSS framework
   - Easy to iterate on design

4. **Cross-Platform Ready**
   - Same codebase for Linux, Windows, macOS
   - electron-builder handles packaging

### Successful Precedents

- **VS Code** - Complex IDE, excellent performance
- **Obsidian** - Note-taking with local-first storage
- **Slack/Discord** - Real-time communication
- **Notion** - Rich document editing

---

## Technology Stack

### Core Framework

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Runtime** | Electron 28+ | Latest stable, security updates |
| **Language** | TypeScript | Type safety, better DX |
| **UI Framework** | React 18 | Component model, huge ecosystem |
| **State Management** | Zustand | Simple, performant, no boilerplate |
| **Styling** | Tailwind CSS | Utility-first, fast iteration |
| **Component Library** | shadcn/ui | Beautiful, accessible, customizable |

### Key Dependencies

```json
{
  "dependencies": {
    // Electron
    "electron": "^28.0.0",

    // UI
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.0",
    "tailwindcss": "^3.4.0",

    // Audio
    "naudiodon": "^2.3.0",

    // Transcription
    "openai": "^4.20.0",
    "whisper-node": "^1.0.0",

    // System integration
    "robotjs": "^0.6.0",
    "iohook": "^0.9.3",

    // Storage
    "better-sqlite3": "^9.2.0",
    "electron-store": "^8.1.0"
  },
  "devDependencies": {
    "electron-builder": "^24.9.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0"
  }
}
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process (UI)                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    React Application                 │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐  │    │
│  │  │Recording│  │ History │  │Settings │  │  Tray  │  │    │
│  │  │  View   │  │  View   │  │  View   │  │ Popover│  │    │
│  │  └─────────┘  └─────────┘  └─────────┘  └────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                         IPC Bridge                           │
├─────────────────────────────────────────────────────────────┤
│                     Main Process (Node.js)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  Audio   │  │Transcript│  │  Hotkey  │  │ Clipboard│     │
│  │ Service  │  │ Service  │  │ Manager  │  │ Manager  │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │   Tray   │  │ Database │  │  Config  │                   │
│  │ Manager  │  │ Service  │  │  Store   │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Process Responsibilities

**Main Process:**
- Audio recording (native modules)
- Transcription API calls
- Global hotkey registration
- System tray management
- Clipboard operations
- Database access
- Window management

**Renderer Process:**
- React UI rendering
- User interactions
- State management
- IPC communication with main

**IPC Communication:**
- `ipcMain` / `ipcRenderer` for request/response
- `contextBridge` for secure API exposure

---

## Audio Subsystem

### Recording with naudiodon

```typescript
// src/main/services/audio.ts
import { AudioIO, SampleFormat16Bit } from 'naudiodon';
import { EventEmitter } from 'events';

export interface AudioConfig {
  sampleRate: number;
  channels: number;
  deviceId?: number;
}

export class AudioService extends EventEmitter {
  private audioIO: AudioIO | null = null;
  private chunks: Buffer[] = [];
  private isRecording = false;

  constructor(private config: AudioConfig = {
    sampleRate: 16000,
    channels: 1,
  }) {
    super();
  }

  async getInputDevices(): Promise<AudioDevice[]> {
    const devices = AudioIO.getDevices();
    return devices
      .filter(d => d.maxInputChannels > 0)
      .map(d => ({
        id: d.id,
        name: d.name,
        isDefault: d.defaultSampleRate === this.config.sampleRate,
      }));
  }

  startRecording(): void {
    if (this.isRecording) return;

    this.chunks = [];
    this.isRecording = true;

    this.audioIO = AudioIO({
      inOptions: {
        channelCount: this.config.channels,
        sampleFormat: SampleFormat16Bit,
        sampleRate: this.config.sampleRate,
        deviceId: this.config.deviceId ?? -1, // -1 = default
        closeOnError: false,
      },
    });

    this.audioIO.on('data', (chunk: Buffer) => {
      this.chunks.push(chunk);
      this.emit('audio-level', this.calculateLevel(chunk));
    });

    this.audioIO.on('error', (err: Error) => {
      this.emit('error', err);
    });

    this.audioIO.start();
    this.emit('recording-started');
  }

  stopRecording(): Buffer {
    if (!this.isRecording || !this.audioIO) {
      throw new Error('Not recording');
    }

    this.audioIO.quit();
    this.audioIO = null;
    this.isRecording = false;

    const audioBuffer = Buffer.concat(this.chunks);
    this.chunks = [];

    this.emit('recording-stopped', audioBuffer);
    return audioBuffer;
  }

  private calculateLevel(chunk: Buffer): number {
    // Calculate RMS for visualization
    const samples = new Int16Array(chunk.buffer, chunk.byteOffset, chunk.length / 2);
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length) / 32768;
  }
}

export interface AudioDevice {
  id: number;
  name: string;
  isDefault: boolean;
}
```

### WAV Encoding

```typescript
// src/main/services/wav-encoder.ts
export function encodeWav(
  audioBuffer: Buffer,
  sampleRate: number = 16000,
  channels: number = 1,
  bitsPerSample: number = 16
): Buffer {
  const dataLength = audioBuffer.length;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const buffer = Buffer.alloc(totalLength);
  let offset = 0;

  // RIFF header
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(totalLength - 8, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;

  // fmt chunk
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4; // chunk size
  buffer.writeUInt16LE(1, offset); offset += 2;  // PCM format
  buffer.writeUInt16LE(channels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, offset); offset += 4;
  buffer.writeUInt16LE(channels * bitsPerSample / 8, offset); offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;

  // data chunk
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataLength, offset); offset += 4;

  // Audio data
  audioBuffer.copy(buffer, offset);

  return buffer;
}
```

---

## Transcription Services

### Service Interface

```typescript
// src/main/services/transcription/types.ts
export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
  temperature?: number;
  wordTimestamps?: boolean;
}

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  segments?: Segment[];
  words?: Word[];
}

export interface Segment {
  start: number;
  end: number;
  text: string;
}

export interface Word {
  start: number;
  end: number;
  word: string;
}

export interface TranscriptionService {
  name: string;
  transcribe(audio: Buffer, options: TranscriptionOptions): Promise<TranscriptionResult>;
}
```

### OpenAI Service

```typescript
// src/main/services/transcription/openai.ts
import OpenAI from 'openai';
import { Readable } from 'stream';
import { encodeWav } from '../wav-encoder';
import type { TranscriptionService, TranscriptionOptions, TranscriptionResult } from './types';

export class OpenAITranscriptionService implements TranscriptionService {
  name = 'OpenAI Whisper';
  private client: OpenAI;
  private model: 'whisper-1' | 'gpt-4o-transcribe';

  constructor(apiKey: string, model: 'whisper-1' | 'gpt-4o-transcribe' = 'whisper-1') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async transcribe(audio: Buffer, options: TranscriptionOptions): Promise<TranscriptionResult> {
    // Encode to WAV
    const wavBuffer = encodeWav(audio);

    // Create a File-like object for the API
    const file = new File([wavBuffer], 'audio.wav', { type: 'audio/wav' });

    // Build request parameters
    const params: OpenAI.Audio.TranscriptionCreateParams = {
      file,
      model: this.model,
      response_format: 'verbose_json',
    };

    if (options.language) {
      params.language = options.language;
    }

    if (options.prompt) {
      params.prompt = options.prompt;
    }

    if (options.temperature !== undefined) {
      params.temperature = options.temperature;
    }

    if (options.wordTimestamps) {
      params.timestamp_granularities = ['word', 'segment'];
    }

    // Call API
    const response = await this.client.audio.transcriptions.create(params);

    // Parse response (verbose_json format)
    const result = response as OpenAI.Audio.Transcription & {
      language: string;
      duration: number;
      segments?: Array<{ start: number; end: number; text: string }>;
      words?: Array<{ start: number; end: number; word: string }>;
    };

    return {
      text: result.text,
      language: result.language || 'unknown',
      duration: result.duration || 0,
      segments: result.segments?.map(s => ({
        start: s.start * 1000,
        end: s.end * 1000,
        text: s.text,
      })),
      words: result.words?.map(w => ({
        start: w.start * 1000,
        end: w.end * 1000,
        word: w.word,
      })),
    };
  }
}
```

### Local Whisper Service (whisper-node)

```typescript
// src/main/services/transcription/whisper-local.ts
import { whisper } from 'whisper-node';
import path from 'path';
import { app } from 'electron';
import type { TranscriptionService, TranscriptionOptions, TranscriptionResult } from './types';

export class WhisperLocalService implements TranscriptionService {
  name = 'Local Whisper';
  private modelPath: string;

  constructor(modelName: string = 'base') {
    this.modelPath = path.join(
      app.getPath('userData'),
      'models',
      `ggml-${modelName}.bin`
    );
  }

  async transcribe(audio: Buffer, options: TranscriptionOptions): Promise<TranscriptionResult> {
    // whisper-node expects a file path, so we need to write temp file
    const tempPath = path.join(app.getPath('temp'), `voiceink-${Date.now()}.wav`);
    const wavBuffer = encodeWav(audio);
    await fs.promises.writeFile(tempPath, wavBuffer);

    try {
      const result = await whisper(tempPath, {
        modelPath: this.modelPath,
        language: options.language || 'auto',
        word_timestamps: options.wordTimestamps,
      });

      return {
        text: result.map(s => s.speech).join(' '),
        language: options.language || 'detected',
        duration: audio.length / 32000 * 1000, // 16-bit stereo at 16kHz
        segments: result.map(s => ({
          start: s.start,
          end: s.end,
          text: s.speech,
        })),
      };
    } finally {
      // Cleanup temp file
      await fs.promises.unlink(tempPath).catch(() => {});
    }
  }
}
```

### Transcription Manager

```typescript
// src/main/services/transcription/manager.ts
import { OpenAITranscriptionService } from './openai';
import { WhisperLocalService } from './whisper-local';
import type { TranscriptionService, TranscriptionOptions, TranscriptionResult } from './types';

export class TranscriptionManager {
  private services: Map<string, TranscriptionService> = new Map();
  private primaryService: string = 'openai';

  constructor() {
    // Services are initialized when configured
  }

  configureOpenAI(apiKey: string, model: 'whisper-1' | 'gpt-4o-transcribe' = 'whisper-1') {
    this.services.set('openai', new OpenAITranscriptionService(apiKey, model));
  }

  configureLocal(modelName: string = 'base') {
    this.services.set('local', new WhisperLocalService(modelName));
  }

  setPrimaryService(name: string) {
    if (!this.services.has(name)) {
      throw new Error(`Service ${name} not configured`);
    }
    this.primaryService = name;
  }

  async transcribe(audio: Buffer, options: TranscriptionOptions): Promise<TranscriptionResult> {
    const service = this.services.get(this.primaryService);
    if (!service) {
      throw new Error('No transcription service configured');
    }

    return service.transcribe(audio, options);
  }

  getAvailableServices(): string[] {
    return Array.from(this.services.keys());
  }
}
```

---

## User Interface

### Main Window Setup

```typescript
// src/main/windows/main.ts
import { BrowserWindow, shell } from 'electron';
import path from 'path';

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    frame: false, // Custom title bar
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 16 },
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

  // Open external links in browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  return win;
}
```

### Preload Script (Context Bridge)

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

export type RecordingState = 'idle' | 'recording' | 'processing' | 'complete' | 'error';

const api = {
  // Audio
  startRecording: () => ipcRenderer.invoke('audio:start'),
  stopRecording: () => ipcRenderer.invoke('audio:stop'),
  getAudioDevices: () => ipcRenderer.invoke('audio:devices'),
  setAudioDevice: (id: number) => ipcRenderer.invoke('audio:set-device', id),
  onAudioLevel: (callback: (level: number) => void) => {
    ipcRenderer.on('audio:level', (_, level) => callback(level));
  },

  // Transcription
  transcribe: (options?: TranscriptionOptions) => ipcRenderer.invoke('transcribe', options),
  setTranscriptionService: (service: string) => ipcRenderer.invoke('transcription:set-service', service),
  getTranscriptionServices: () => ipcRenderer.invoke('transcription:get-services'),

  // Settings
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('config:set', key, value),

  // History
  getHistory: (limit?: number) => ipcRenderer.invoke('history:get', limit),
  searchHistory: (query: string) => ipcRenderer.invoke('history:search', query),
  deleteHistoryItem: (id: number) => ipcRenderer.invoke('history:delete', id),

  // Window
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // Clipboard
  copyToClipboard: (text: string) => ipcRenderer.invoke('clipboard:copy', text),
  paste: () => ipcRenderer.invoke('clipboard:paste'),

  // Events from main
  onRecordingState: (callback: (state: RecordingState) => void) => {
    ipcRenderer.on('recording:state', (_, state) => callback(state));
  },
  onTranscriptionResult: (callback: (result: TranscriptionResult) => void) => {
    ipcRenderer.on('transcription:result', (_, result) => callback(result));
  },
  onError: (callback: (error: string) => void) => {
    ipcRenderer.on('error', (_, error) => callback(error));
  },
};

contextBridge.exposeInMainWorld('voiceink', api);

// Type declaration for renderer
declare global {
  interface Window {
    voiceink: typeof api;
  }
}
```

### React App Structure

```typescript
// src/renderer/App.tsx
import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { RecordingView } from './views/RecordingView';
import { HistoryView } from './views/HistoryView';
import { SettingsView } from './views/SettingsView';
import { TitleBar } from './components/TitleBar';

type View = 'recording' | 'history' | 'settings';

export function App() {
  const [currentView, setCurrentView] = useState<View>('recording');

  return (
    <div className="flex flex-col h-screen bg-background">
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentView={currentView} onViewChange={setCurrentView} />

        <main className="flex-1 overflow-auto p-6">
          {currentView === 'recording' && <RecordingView />}
          {currentView === 'history' && <HistoryView />}
          {currentView === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
}
```

### Recording View

```typescript
// src/renderer/views/RecordingView.tsx
import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { Button } from '../components/ui/button';
import { Waveform } from '../components/Waveform';
import { Mic, Square, Loader2 } from 'lucide-react';

export function RecordingView() {
  const { recordingState, audioLevel, lastResult, error } = useStore();
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    // Listen for recording state changes
    window.voiceink.onRecordingState((state) => {
      useStore.setState({ recordingState: state });
      setIsRecording(state === 'recording');
    });

    window.voiceink.onAudioLevel((level) => {
      useStore.setState({ audioLevel: level });
    });

    window.voiceink.onTranscriptionResult((result) => {
      useStore.setState({ lastResult: result, recordingState: 'complete' });
    });

    window.voiceink.onError((error) => {
      useStore.setState({ error, recordingState: 'error' });
    });
  }, []);

  const handleToggleRecording = async () => {
    if (isRecording) {
      await window.voiceink.stopRecording();
    } else {
      await window.voiceink.startRecording();
    }
  };

  const handleCopy = async () => {
    if (lastResult?.text) {
      await window.voiceink.copyToClipboard(lastResult.text);
    }
  };

  const handlePaste = async () => {
    await window.voiceink.paste();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-8">
      {/* Waveform visualization */}
      <Waveform level={audioLevel} isRecording={isRecording} />

      {/* Status text */}
      <p className="text-muted-foreground">
        {recordingState === 'idle' && 'Press hotkey or click to record'}
        {recordingState === 'recording' && 'Recording...'}
        {recordingState === 'processing' && 'Transcribing...'}
        {recordingState === 'complete' && 'Transcription complete'}
        {recordingState === 'error' && error}
      </p>

      {/* Record button */}
      <Button
        size="lg"
        variant={isRecording ? 'destructive' : 'default'}
        className="rounded-full w-16 h-16"
        onClick={handleToggleRecording}
        disabled={recordingState === 'processing'}
      >
        {recordingState === 'processing' ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : isRecording ? (
          <Square className="w-6 h-6" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </Button>

      {/* Result display */}
      {lastResult && (
        <div className="w-full max-w-lg p-4 rounded-lg bg-muted">
          <p className="text-sm mb-3">{lastResult.text}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleCopy}>
              Copy
            </Button>
            <Button size="sm" onClick={handlePaste}>
              Paste
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Zustand Store

```typescript
// src/renderer/store.ts
import { create } from 'zustand';

interface VoiceInkState {
  // Recording
  recordingState: 'idle' | 'recording' | 'processing' | 'complete' | 'error';
  audioLevel: number;

  // Transcription
  lastResult: TranscriptionResult | null;

  // History
  history: Transcription[];

  // Settings
  config: AppConfig | null;

  // Errors
  error: string | null;
}

export const useStore = create<VoiceInkState>((set) => ({
  recordingState: 'idle',
  audioLevel: 0,
  lastResult: null,
  history: [],
  config: null,
  error: null,
}));
```

### Waveform Component

```typescript
// src/renderer/components/Waveform.tsx
import { useEffect, useRef } from 'react';

interface WaveformProps {
  level: number;
  isRecording: boolean;
}

export function Waveform({ level, isRecording }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Add current level to history
    historyRef.current.push(level);
    if (historyRef.current.length > 100) {
      historyRef.current.shift();
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw waveform
    const barWidth = canvas.width / historyRef.current.length;
    const centerY = canvas.height / 2;

    ctx.fillStyle = isRecording ? '#ef4444' : '#3b82f6';

    historyRef.current.forEach((value, i) => {
      const barHeight = value * canvas.height * 0.8;
      const x = i * barWidth;
      const y = centerY - barHeight / 2;

      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });
  }, [level, isRecording]);

  // Reset history when not recording
  useEffect(() => {
    if (!isRecording) {
      historyRef.current = [];
    }
  }, [isRecording]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={100}
      className="rounded-lg bg-muted"
    />
  );
}
```

---

## System Integration

### Global Hotkey Manager

```typescript
// src/main/services/hotkeys.ts
import { globalShortcut, BrowserWindow } from 'electron';
import { uIOhook, UiohookKey } from 'uiohook-napi';

export interface HotkeyConfig {
  toggleRecording: string;
  cancelRecording: string;
  pushToTalk?: UiohookKey;
}

export class HotkeyManager {
  private mainWindow: BrowserWindow;
  private pushToTalkKey?: UiohookKey;
  private isPushToTalkPressed = false;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  register(config: HotkeyConfig): void {
    // Toggle recording hotkey
    globalShortcut.register(config.toggleRecording, () => {
      this.mainWindow.webContents.send('hotkey:toggle-recording');
    });

    // Cancel recording hotkey
    globalShortcut.register(config.cancelRecording, () => {
      this.mainWindow.webContents.send('hotkey:cancel-recording');
    });

    // Push-to-talk with uiohook for modifier keys
    if (config.pushToTalk) {
      this.pushToTalkKey = config.pushToTalk;
      this.setupPushToTalk();
    }
  }

  private setupPushToTalk(): void {
    uIOhook.on('keydown', (e) => {
      if (e.keycode === this.pushToTalkKey && !this.isPushToTalkPressed) {
        this.isPushToTalkPressed = true;
        this.mainWindow.webContents.send('hotkey:push-to-talk-start');
      }
    });

    uIOhook.on('keyup', (e) => {
      if (e.keycode === this.pushToTalkKey && this.isPushToTalkPressed) {
        this.isPushToTalkPressed = false;
        this.mainWindow.webContents.send('hotkey:push-to-talk-stop');
      }
    });

    uIOhook.start();
  }

  unregister(): void {
    globalShortcut.unregisterAll();
    uIOhook.stop();
  }
}

// Common hotkey configurations
export const DEFAULT_HOTKEYS: HotkeyConfig = {
  toggleRecording: 'CommandOrControl+Shift+Space',
  cancelRecording: 'Escape',
  pushToTalk: UiohookKey.Alt, // Right Alt
};
```

### System Tray

```typescript
// src/main/services/tray.ts
import { Tray, Menu, nativeImage, BrowserWindow } from 'electron';
import path from 'path';

export class TrayManager {
  private tray: Tray;
  private mainWindow: BrowserWindow;
  private isRecording = false;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;

    // Create tray icon
    const iconPath = path.join(__dirname, '../../resources/icons/tray-icon.png');
    const icon = nativeImage.createFromPath(iconPath);
    this.tray = new Tray(icon.resize({ width: 16, height: 16 }));

    this.tray.setToolTip('VoiceInk');
    this.updateMenu();

    // Click to show window
    this.tray.on('click', () => {
      if (this.mainWindow.isVisible()) {
        this.mainWindow.hide();
      } else {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    });
  }

  setRecording(recording: boolean): void {
    this.isRecording = recording;

    // Update icon
    const iconName = recording ? 'tray-icon-recording.png' : 'tray-icon.png';
    const iconPath = path.join(__dirname, `../../resources/icons/${iconName}`);
    const icon = nativeImage.createFromPath(iconPath);
    this.tray.setImage(icon.resize({ width: 16, height: 16 }));

    this.updateMenu();
  }

  private updateMenu(): void {
    const menu = Menu.buildFromTemplate([
      {
        label: 'Show VoiceInk',
        click: () => {
          this.mainWindow.show();
          this.mainWindow.focus();
        },
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
          this.mainWindow.show();
          this.mainWindow.webContents.send('navigate:settings');
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          this.mainWindow.destroy();
          process.exit(0);
        },
      },
    ]);

    this.tray.setContextMenu(menu);
  }

  destroy(): void {
    this.tray.destroy();
  }
}
```

### Clipboard and Paste

```typescript
// src/main/services/clipboard.ts
import { clipboard } from 'electron';
import robot from 'robotjs';

export class ClipboardManager {
  private previousContent: string = '';

  copyToClipboard(text: string): void {
    // Save previous content for potential restoration
    this.previousContent = clipboard.readText();
    clipboard.writeText(text);
  }

  async paste(): Promise<void> {
    // Small delay to ensure clipboard is ready
    await new Promise(resolve => setTimeout(resolve, 50));

    // Simulate Ctrl+V
    robot.keyTap('v', ['control']);
  }

  restorePrevious(): void {
    if (this.previousContent) {
      clipboard.writeText(this.previousContent);
    }
  }
}
```

### Alternative: nut-js for Better Compatibility

```typescript
// src/main/services/clipboard-nut.ts
import { clipboard } from 'electron';
import { keyboard, Key } from '@nut-tree/nut-js';

export class ClipboardManager {
  async paste(): Promise<void> {
    await keyboard.pressKey(Key.LeftControl);
    await keyboard.pressKey(Key.V);
    await keyboard.releaseKey(Key.V);
    await keyboard.releaseKey(Key.LeftControl);
  }
}
```

---

## Data Persistence

### Configuration Store

```typescript
// src/main/services/config.ts
import Store from 'electron-store';

interface AppConfig {
  general: {
    launchAtLogin: boolean;
    showInTray: boolean;
    closeToTray: boolean;
  };
  audio: {
    inputDevice: string;
    sampleRate: number;
  };
  transcription: {
    service: 'openai' | 'local';
    openai: {
      apiKey: string;
      model: 'whisper-1' | 'gpt-4o-transcribe';
    };
    local: {
      model: string;
      useGpu: boolean;
    };
  };
  hotkeys: {
    toggleRecording: string;
    cancelRecording: string;
    pushToTalk: string;
  };
  output: {
    autoPaste: boolean;
    autoCopy: boolean;
  };
  processing: {
    wordReplacements: Array<{ from: string; to: string }>;
    customVocabulary: string[];
  };
}

const defaults: AppConfig = {
  general: {
    launchAtLogin: false,
    showInTray: true,
    closeToTray: true,
  },
  audio: {
    inputDevice: 'default',
    sampleRate: 16000,
  },
  transcription: {
    service: 'openai',
    openai: {
      apiKey: '',
      model: 'whisper-1',
    },
    local: {
      model: 'base',
      useGpu: true,
    },
  },
  hotkeys: {
    toggleRecording: 'CommandOrControl+Shift+Space',
    cancelRecording: 'Escape',
    pushToTalk: 'RightAlt',
  },
  output: {
    autoPaste: true,
    autoCopy: true,
  },
  processing: {
    wordReplacements: [],
    customVocabulary: [],
  },
};

export const configStore = new Store<AppConfig>({
  defaults,
  encryptionKey: 'voiceink-config-key', // For API key encryption
});
```

### SQLite Database for History

```typescript
// src/main/services/database.ts
import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';

export interface Transcription {
  id: number;
  text: string;
  language: string;
  duration: number;
  service: string;
  createdAt: string;
}

export class TranscriptionDatabase {
  private db: Database.Database;

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'transcriptions.db');
    this.db = new Database(dbPath);

    // Initialize schema
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transcriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        language TEXT,
        duration INTEGER,
        service TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_created_at ON transcriptions(created_at);

      CREATE VIRTUAL TABLE IF NOT EXISTS transcriptions_fts USING fts5(
        text,
        content=transcriptions,
        content_rowid=id
      );

      -- Triggers to keep FTS in sync
      CREATE TRIGGER IF NOT EXISTS transcriptions_ai AFTER INSERT ON transcriptions BEGIN
        INSERT INTO transcriptions_fts(rowid, text) VALUES (new.id, new.text);
      END;

      CREATE TRIGGER IF NOT EXISTS transcriptions_ad AFTER DELETE ON transcriptions BEGIN
        INSERT INTO transcriptions_fts(transcriptions_fts, rowid, text) VALUES('delete', old.id, old.text);
      END;
    `);
  }

  insert(result: TranscriptionResult, service: string): number {
    const stmt = this.db.prepare(`
      INSERT INTO transcriptions (text, language, duration, service)
      VALUES (?, ?, ?, ?)
    `);

    const info = stmt.run(result.text, result.language, result.duration, service);
    return info.lastInsertRowid as number;
  }

  getRecent(limit: number = 50): Transcription[] {
    const stmt = this.db.prepare(`
      SELECT id, text, language, duration, service, created_at as createdAt
      FROM transcriptions
      ORDER BY created_at DESC
      LIMIT ?
    `);

    return stmt.all(limit) as Transcription[];
  }

  search(query: string, limit: number = 50): Transcription[] {
    const stmt = this.db.prepare(`
      SELECT t.id, t.text, t.language, t.duration, t.service, t.created_at as createdAt
      FROM transcriptions t
      JOIN transcriptions_fts fts ON t.id = fts.rowid
      WHERE transcriptions_fts MATCH ?
      ORDER BY t.created_at DESC
      LIMIT ?
    `);

    return stmt.all(query, limit) as Transcription[];
  }

  delete(id: number): void {
    const stmt = this.db.prepare('DELETE FROM transcriptions WHERE id = ?');
    stmt.run(id);
  }

  close(): void {
    this.db.close();
  }
}
```

---

## Project Structure

```
voiceink-electron/
├── package.json
├── electron-builder.yml
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
│
├── src/
│   ├── main/                      # Main process
│   │   ├── index.ts               # Entry point
│   │   ├── ipc.ts                 # IPC handlers
│   │   │
│   │   ├── services/
│   │   │   ├── audio.ts           # Audio recording
│   │   │   ├── wav-encoder.ts     # WAV encoding
│   │   │   ├── hotkeys.ts         # Global hotkeys
│   │   │   ├── tray.ts            # System tray
│   │   │   ├── clipboard.ts       # Clipboard + paste
│   │   │   ├── config.ts          # Configuration store
│   │   │   ├── database.ts        # SQLite history
│   │   │   └── transcription/
│   │   │       ├── types.ts
│   │   │       ├── openai.ts
│   │   │       ├── whisper-local.ts
│   │   │       └── manager.ts
│   │   │
│   │   └── windows/
│   │       └── main.ts            # Window creation
│   │
│   ├── preload/                   # Preload scripts
│   │   └── index.ts               # Context bridge
│   │
│   └── renderer/                  # Renderer process (React)
│       ├── index.html
│       ├── index.tsx              # React entry
│       ├── App.tsx
│       ├── store.ts               # Zustand store
│       │
│       ├── components/
│       │   ├── ui/                # shadcn components
│       │   ├── Sidebar.tsx
│       │   ├── TitleBar.tsx
│       │   └── Waveform.tsx
│       │
│       ├── views/
│       │   ├── RecordingView.tsx
│       │   ├── HistoryView.tsx
│       │   └── SettingsView.tsx
│       │
│       └── styles/
│           └── globals.css        # Tailwind imports
│
├── resources/
│   ├── icons/
│   │   ├── icon.png               # App icon
│   │   ├── icon.icns              # macOS icon
│   │   ├── icon.ico               # Windows icon
│   │   ├── tray-icon.png
│   │   └── tray-icon-recording.png
│   └── linux/
│       └── voiceink.desktop       # Desktop entry
│
└── tests/
    ├── main/
    │   └── audio.test.ts
    └── renderer/
        └── components.test.tsx
```

### Main Entry Point

```typescript
// src/main/index.ts
import { app, BrowserWindow } from 'electron';
import { createMainWindow } from './windows/main';
import { setupIpcHandlers } from './ipc';
import { HotkeyManager, DEFAULT_HOTKEYS } from './services/hotkeys';
import { TrayManager } from './services/tray';
import { AudioService } from './services/audio';
import { TranscriptionManager } from './services/transcription/manager';
import { TranscriptionDatabase } from './services/database';
import { configStore } from './services/config';

let mainWindow: BrowserWindow | null = null;
let hotkeyManager: HotkeyManager | null = null;
let trayManager: TrayManager | null = null;

// Services
const audioService = new AudioService();
const transcriptionManager = new TranscriptionManager();
const database = new TranscriptionDatabase();

app.whenReady().then(() => {
  // Create main window
  mainWindow = createMainWindow();

  // Setup services
  const config = configStore.store;

  if (config.transcription.openai.apiKey) {
    transcriptionManager.configureOpenAI(
      config.transcription.openai.apiKey,
      config.transcription.openai.model
    );
  }

  // Setup system integration
  hotkeyManager = new HotkeyManager(mainWindow);
  hotkeyManager.register(DEFAULT_HOTKEYS);

  trayManager = new TrayManager(mainWindow);

  // Setup IPC handlers
  setupIpcHandlers(mainWindow, {
    audioService,
    transcriptionManager,
    database,
    trayManager,
  });

  // Handle window close
  mainWindow.on('close', (e) => {
    if (config.general.closeToTray) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  hotkeyManager?.unregister();
  trayManager?.destroy();
  database.close();
});
```

---

## Development Phases

### Phase 1: Foundation (1-2 weeks)
**Goal:** Basic recording and transcription working

- [x] Project setup (Vite + Electron + React)
- [ ] Audio recording with naudiodon
- [ ] OpenAI API integration
- [ ] Basic UI with record button
- [ ] Clipboard copy

**Deliverable:** Click → Record → Transcribe → Copy text

### Phase 2: System Integration (1-2 weeks)
**Goal:** System-wide accessibility

- [ ] Global hotkeys with globalShortcut
- [ ] Push-to-talk with uiohook
- [ ] System tray with menu
- [ ] Auto-paste functionality
- [ ] Close to tray

**Deliverable:** Use from any app with hotkeys

### Phase 3: Local Transcription (1 week)
**Goal:** Offline capability

- [ ] whisper-node integration
- [ ] Model download UI
- [ ] Service switching
- [ ] GPU acceleration detection

**Deliverable:** Toggle between cloud/local

### Phase 4: Polish (1-2 weeks)
**Goal:** Production-ready UX

- [ ] Waveform visualization
- [ ] Transcription history with search
- [ ] Settings UI
- [ ] Error handling and notifications
- [ ] Launch at login

**Deliverable:** Complete user experience

### Phase 5: Advanced Features (1-2 weeks)
**Goal:** Feature parity

- [ ] Word replacements
- [ ] Custom vocabulary/prompts
- [ ] Audio device selection
- [ ] Export functionality
- [ ] Keyboard shortcuts customization

**Deliverable:** v1.0 release

### Phase 6: Distribution (1 week)
**Goal:** Easy installation

- [ ] AppImage for Linux
- [ ] .deb for Ubuntu/Debian
- [ ] Auto-update setup
- [ ] Documentation

**Deliverable:** Distributable packages

**Total estimated time: 6-10 weeks**

---

## Build and Distribution

### electron-builder Configuration

```yaml
# electron-builder.yml
appId: com.voiceink.linux
productName: VoiceInk
copyright: Copyright © 2024

directories:
  output: dist
  buildResources: resources

files:
  - "!**/.git"
  - "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}"

linux:
  target:
    - AppImage
    - deb
  category: AudioVideo
  icon: resources/icons/icon.png
  desktop:
    StartupWMClass: voiceink

deb:
  depends:
    - libgtk-3-0
    - libnotify4
    - libnss3
    - libxss1
    - libxtst6
    - xdg-utils
    - libatspi2.0-0
    - libuuid1

appImage:
  license: LICENSE

publish:
  provider: github
  owner: yourusername
  repo: voiceink-linux
```

### Build Commands

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "electron:dev": "concurrently \"vite\" \"wait-on tcp:5173 && electron .\"",
    "electron:build": "npm run build && electron-builder",
    "electron:build:linux": "npm run build && electron-builder --linux",
    "test": "vitest",
    "lint": "eslint src --ext .ts,.tsx"
  }
}
```

### Development Workflow

```bash
# Install dependencies
npm install

# Development mode (hot reload)
npm run electron:dev

# Build for Linux
npm run electron:build:linux

# Output in dist/
# - VoiceInk-1.0.0.AppImage
# - voiceink_1.0.0_amd64.deb
```

---

## Performance Optimizations

### 1. Lazy Loading

```typescript
// Only load heavy services when needed
const whisperService = lazy(() => import('./services/transcription/whisper-local'));
```

### 2. Audio Buffer Management

```typescript
// Use typed arrays for audio processing
const samples = new Float32Array(buffer.buffer);
```

### 3. Debounced Updates

```typescript
// Debounce audio level updates to UI
const debouncedLevel = useMemo(
  () => debounce((level: number) => setAudioLevel(level), 50),
  []
);
```

### 4. Virtual List for History

```typescript
// Use react-window for large history lists
import { FixedSizeList } from 'react-window';
```

---

## Security Considerations

1. **API Key Storage**
   - Use electron-store with encryption
   - Never expose in renderer process
   - Validate before use

2. **Context Isolation**
   - Always use contextBridge
   - Never expose Node.js in renderer
   - Sanitize IPC inputs

3. **Dependencies**
   - Regular npm audit
   - Pin versions
   - Review native modules

4. **Updates**
   - Use electron-updater for secure updates
   - Verify signatures

---

## Comparison: Electron vs Rust+GTK4

| Aspect | Electron | Rust+GTK4 |
|--------|----------|-----------|
| **Dev Time** | 6-10 weeks | 10-14 weeks |
| **Memory** | ~150MB idle | ~30-50MB idle |
| **Disk** | ~150MB | ~15MB |
| **Startup** | 1-3s | <0.5s |
| **Cross-platform** | Easy | Per-platform work |
| **UI Polish** | Excellent | Good |
| **Native Feel** | Okay | Better |
| **Hiring** | Easier | Harder |

---

## Conclusion

The Electron architecture provides a faster path to a working product with trade-offs in resource usage. The familiar React/TypeScript stack enables rapid iteration on UI/UX while still delivering all core features.

Key advantages:
- **Faster development** with web technologies
- **Rich ecosystem** for UI components
- **Easier maintenance** and contributions
- **Cross-platform ready** for future expansion

The 150MB memory overhead is acceptable for most desktop users, and apps like VS Code and Obsidian demonstrate that Electron can deliver polished experiences.

Recommended approach:
1. Start with OpenAI API for quick MVP
2. Add local whisper support in Phase 3
3. Focus on UX polish before optimization
4. Consider native rewrite only if memory becomes a real user complaint
