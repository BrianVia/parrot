# AGENTS_READ_THIS.md

This document captures the complete context, decisions, and rationale behind Parrot's development. Read this to understand not just *what* was built, but *why*.

## Project Origin

Parrot originated as a Linux port of **VoiceInk**, a macOS voice-to-text app. The original VoiceInk is a native Swift/SwiftUI app using local whisper.cpp for transcription.

### Why a New Project?

Analysis of VoiceInk showed ~95% of the codebase is macOS-specific:
- SwiftUI views
- AppKit integration
- CoreAudio for recording
- Accessibility APIs
- macOS-specific services

A port would require a complete rewrite, so we started fresh with a new name and architecture.

### Name Choice

"Parrot" was chosen from brainstormed options for:
- Voice/speech association (parrots mimic speech)
- Short, memorable, available
- Good logo potential

## Architecture Decision: Electron vs Rust+GTK4

Two architectures were fully designed before choosing:

### Option A: Rust + GTK4
- **Pros**: Native performance, low memory, system integration
- **Cons**: 10-14 week timeline, steeper learning curve, smaller ecosystem
- **File**: `architecture_linux.md` (in VoiceInk repo)

### Option B: Electron + React
- **Pros**: 6-10 week timeline, large ecosystem, cross-platform potential
- **Cons**: Higher memory (~150-300MB), larger bundle size
- **File**: `architecture_linux_electron.md` (in VoiceInk repo)

### Decision: Electron

Chose Electron because:
1. **Faster development** - React/TypeScript ecosystem
2. **Cross-platform** - Same codebase for Linux AND macOS
3. **Familiar tooling** - npm, Vite, Tailwind
4. **Sufficient performance** - Transcription is I/O bound, not CPU bound

The memory overhead was acceptable tradeoff for development velocity.

## Key Technical Decisions

### Transcription: OpenAI Whisper API (not local)

Unlike VoiceInk which uses local whisper.cpp, Parrot uses OpenAI's API:
- **Why**: Simpler deployment, no model downloads, consistent quality
- **Tradeoff**: Requires internet, API costs, privacy considerations
- **Future**: Could add local transcription as option

### Audio Recording: naudiodon

Chose naudiodon over other options:
- Cross-platform (Linux ALSA, macOS CoreAudio)
- Simple API for recording
- Emits audio levels for waveform visualization

### Database: better-sqlite3 + FTS5

For transcription history:
- **SQLite**: Embedded, no server needed
- **FTS5**: Full-text search for finding past transcriptions
- **better-sqlite3**: Synchronous API, better performance than node-sqlite3

### Auto-paste: Platform Tools (not robotjs)

Initially used robotjs for simulating Ctrl+V, but:
- No prebuilt binaries for all Electron versions
- Cross-compilation issues

**Solution**: Platform-specific tools
- Linux: `xdotool key ctrl+v`
- macOS: `osascript` (AppleScript)
- Windows: PowerShell SendKeys

### Push-to-Talk: uiohook-napi

For detecting modifier key holds (Right Alt):
- Global keyboard hooks without window focus
- Works across all applications

### Configuration: electron-store

Encrypted configuration storage:
- API keys stored securely
- Automatic persistence
- Type-safe with TypeScript

## What Was Built

### Core Features
1. **Audio recording** with real-time waveform visualization
2. **OpenAI Whisper transcription** with language selection (23 languages)
3. **History management** with full-text search
4. **System tray** with recording state indicator
5. **Push-to-talk** (Right Alt hold)
6. **Global hotkey** (Ctrl+Shift+Space toggle)
7. **Auto-copy/paste** to active window
8. **Sound effects** for recording feedback
9. **Auto-updater** with GitHub releases
10. **Dark mode** support

### Build & Release
- **Vite** for fast builds
- **electron-builder** for packaging
- **GitHub Actions** for CI/CD
- Cross-platform: Linux (AppImage, deb) + macOS (dmg, zip)
- Auto-release on version bump

## Files of Note

### Main Process
- `src/main/index.ts` - App lifecycle, hotkey registration, service wiring
- `src/main/ipc.ts` - All IPC handlers (the "API" between main and renderer)
- `src/main/services/audio.ts` - Recording logic, level emission
- `src/main/services/transcription/manager.ts` - Service orchestration

### Renderer
- `src/renderer/App.tsx` - Main UI, recording state machine
- `src/renderer/views/SettingsView.tsx` - All configuration UI
- `src/renderer/views/HistoryView.tsx` - Transcription history browser

### Configuration
- `src/main/services/config.ts` - Schema and defaults
- `package.json` - electron-builder config for packaging

### CI/CD
- `.github/workflows/release.yml` - Multi-platform build matrix

## Design Patterns Used

### Event-Driven Services
Services extend EventEmitter for loose coupling:
```typescript
audioService.on('level', (level) => /* update waveform */);
audioService.on('stopped', () => /* transcribe */);
transcriptionManager.on('result', () => /* play sound */);
```

### IPC as API Layer
All main↔renderer communication through typed IPC:
```typescript
// Main
ipcMain.handle('audio:start', async () => { ... });

// Preload
contextBridge.exposeInMainWorld('parrot', {
  startRecording: () => ipcRenderer.invoke('audio:start'),
});

// Renderer
await window.parrot.startRecording();
```

### Config-Driven Behavior
Settings stored centrally, services read on demand:
```typescript
const config = getConfig();
if (config.output.autoPaste) {
  await clipboard.copyAndPaste(result.text);
}
```

## Future Considerations

### Potential Enhancements
1. **Local transcription** - Add whisper.cpp option for offline use
2. **Custom models** - Support different Whisper model sizes
3. **Word replacements** - Auto-correct common mistranscriptions
4. **AI enhancement** - Post-process with GPT for formatting
5. **Multiple profiles** - Different settings per app/context
6. **Windows support** - electron-builder supports it, just need testing

### Known Limitations
1. **macOS unsigned** - Shows Gatekeeper warning without Apple Developer account
2. **Linux xdotool** - Required for auto-paste, not installed by default
3. **No ARM Linux** - Only x64 builds currently
4. **API dependency** - Requires OpenAI API key and internet

### Code Signing (macOS)
The workflow has placeholders for Apple code signing. To enable:
1. Get Apple Developer account ($99/year)
2. Create signing certificate
3. Add secrets: `MAC_CERTS`, `MAC_CERTS_PASSWORD`, `APPLE_ID`, etc.
4. Uncomment env vars in `.github/workflows/release.yml`

## Development Philosophy

### Decisions Made During Development

1. **ES Modules over CommonJS** - Modern standard, better tree-shaking
2. **Platform tools over native modules** - Better cross-compilation
3. **Matrix builds over cross-compilation** - More reliable for native deps
4. **Version-triggered releases** - Intentional releases, not every commit

### Code Style
- TypeScript strict mode
- Functional React components with hooks
- Tailwind for styling
- No excessive abstraction - direct, readable code

## Repository Links

- **Parrot**: https://github.com/BrianVia/parrot
- **VoiceInk** (original): https://github.com/Beingpax/VoiceInk
- **Architecture docs**: In VoiceInk repo (`architecture_linux.md`, `architecture_linux_electron.md`)

---

*This document was created to preserve context for future development. Update it as major decisions are made.*
