# CLAUDE.md

This file provides guidance to Claude Code when working with the Parrot codebase.

## Project Overview

Parrot is a cross-platform voice-to-text transcription app built with Electron, React, and TypeScript. It uses OpenAI's Whisper API for transcription.

## Build Commands

```bash
# Development
npm run dev              # Start Vite dev server
npm run electron:dev     # Start Electron with hot reload

# Production builds
npm run build                    # Build all (renderer, main, preload)
npm run electron:build           # Build + package for current platform
npm run electron:build:linux     # Build for Linux (AppImage, deb)

# Quality checks
npm run typecheck        # TypeScript type checking
npm run lint             # ESLint
npm run test             # Vitest tests
```

## Architecture

### Process Model (Electron)

```
┌─────────────────┐     IPC      ┌─────────────────┐
│  Main Process   │◄────────────►│ Renderer Process│
│  (Node.js)      │              │ (Chromium)      │
└────────┬────────┘              └────────┬────────┘
         │                                │
         ▼                                ▼
┌─────────────────┐              ┌─────────────────┐
│ src/main/       │              │ src/renderer/   │
│ - services/     │              │ - components/   │
│ - ipc.ts        │              │ - views/        │
└─────────────────┘              │ - App.tsx       │
                                 └─────────────────┘
```

### Directory Structure

```
src/
├── main/                    # Main process (Node.js)
│   ├── index.ts            # App entry, lifecycle, hotkeys
│   ├── ipc.ts              # IPC handler registration
│   └── services/
│       ├── audio.ts        # Recording with naudiodon
│       ├── clipboard.ts    # Copy/paste (xdotool on Linux)
│       ├── config.ts       # electron-store config
│       ├── database.ts     # SQLite + FTS5 history
│       ├── push-to-talk.ts # uiohook-napi key detection
│       ├── sound.ts        # Audio feedback
│       ├── tray.ts         # System tray
│       ├── updater.ts      # Auto-updates
│       └── transcription/
│           ├── manager.ts  # Service orchestration
│           ├── openai.ts   # Whisper API client
│           └── types.ts    # Shared types
├── preload/
│   └── index.ts            # Context bridge API
└── renderer/               # React UI
    ├── App.tsx             # Main component
    ├── index.tsx           # React entry
    ├── store.ts            # Zustand state
    ├── components/
    │   └── Waveform.tsx    # Audio visualization
    ├── views/
    │   ├── HistoryView.tsx
    │   └── SettingsView.tsx
    └── styles/
        └── globals.css     # Tailwind
```

### Key Services

- **AudioService** (`src/main/services/audio.ts`): Records audio using naudiodon, emits levels for waveform
- **TranscriptionManager** (`src/main/services/transcription/manager.ts`): Orchestrates transcription services
- **OpenAITranscriptionService** (`src/main/services/transcription/openai.ts`): Whisper API integration
- **ClipboardManager** (`src/main/services/clipboard.ts`): Platform-specific paste simulation
- **ConfigStore** (`src/main/services/config.ts`): Encrypted settings with electron-store
- **TranscriptionDatabase** (`src/main/services/database.ts`): SQLite with full-text search

### IPC Communication

All main↔renderer communication goes through `src/main/ipc.ts`. The preload script (`src/preload/index.ts`) exposes a `window.parrot` API.

Key channels:
- `audio:start/stop/cancel` - Recording control
- `transcription:result` - Transcription output
- `config:get/set` - Settings management
- `history:get/search/delete` - History queries

## Dependencies

### Native Modules (require platform-specific builds)
- **better-sqlite3** - SQLite database
- **naudiodon** - Audio I/O
- **uiohook-napi** - Global keyboard hooks

### Key Libraries
- **openai** - Whisper API client
- **electron-store** - Encrypted config storage
- **electron-updater** - Auto-updates

## Configuration

Config is stored encrypted via electron-store. Schema in `src/main/services/config.ts`:

```typescript
interface AppConfig {
  general: { launchAtLogin, showInTray, closeToTray }
  audio: { inputDevice, sampleRate }
  transcription: { service, language, openai: { apiKey, model } }
  hotkeys: { toggleRecording, cancelRecording, pushToTalk }
  output: { autoPaste, autoCopy }
  processing: { wordReplacements, customVocabulary }
}
```

## Release Process

Releases are automated via GitHub Actions when the version in package.json changes:

```bash
npm version patch   # 0.1.0 → 0.1.1
git push
```

This triggers builds for:
- Linux: AppImage, .deb (x64)
- macOS: .dmg, .zip (x64, arm64)

## Platform Notes

### Linux
- Auto-paste requires `xdotool`: `sudo apt install xdotool`
- Audio recording uses ALSA via naudiodon

### macOS
- Unsigned builds show "unidentified developer" warning
- Users must right-click → Open on first launch
- Requires Accessibility permissions for auto-paste

## Common Tasks

### Adding a new IPC handler
1. Add handler in `src/main/ipc.ts`
2. Expose in `src/preload/index.ts`
3. Use via `window.parrot.yourMethod()` in renderer

### Adding a new setting
1. Update `AppConfig` interface in `src/main/services/config.ts`
2. Add default value in `defaults` object
3. Add UI control in `src/renderer/views/SettingsView.tsx`

### Modifying transcription flow
1. Audio recording: `src/main/services/audio.ts`
2. Transcription: `src/main/services/transcription/`
3. Result handling: `audio:stop` handler in `src/main/ipc.ts`
