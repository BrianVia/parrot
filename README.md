# Parrot

Voice to text transcription for Linux.

Parrot repeats what you say - as text.

## Features

- Fast, accurate transcription via OpenAI Whisper API
- Global hotkey (Ctrl+Shift+Space) to record from anywhere
- Automatic clipboard copy
- Transcription history with search
- Local whisper.cpp support (coming soon)

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm run electron:dev
```

### Build

```bash
# Build for Linux
npm run electron:build:linux

# Output in release/
```

## Configuration

1. Get an API key from [platform.openai.com](https://platform.openai.com/api-keys)
2. Open Settings in the app
3. Enter your API key

## License

GPL-3.0

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed technical documentation.
