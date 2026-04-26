# Sprik

Press a hotkey, speak, get text — pasted where you need it.

Sprik is a cross-platform desktop app that transcribes speech to text,
with optional post-processing via an LLM. Lives in the system tray, no window in your way.

## Features

- **Global hotkey** — press once to start recording, press again to stop and transcribe (`Ctrl+Alt+Space` by default, rebindable)
- **Auto-paste** — result lands directly where your cursor is; falls back to clipboard if paste is unavailable
- **Post-processing** — optional LLM cleanup pass (Anthropic or OpenAI) with prompt caching
- **History** — searchable log of past transcriptions; export to JSON
- **Autostart** — optional launch at login (Windows, macOS, Linux)
- **Encrypted key storage** — API keys stored via Electron `safeStorage`, never in plain text

## Requirements

- Node ≥ 20 (22 LTS recommended)
- pnpm
- An API key for at least one transcription provider (Groq or OpenAI)

## Setup

```bash
pnpm install
```

For development, copy `.env.example` to `.env.local` and add your API keys.

## Usage

```bash
# Development (hot reload)
pnpm dev

# Format
pnpm format

# Type check
pnpm typecheck

# Lint
pnpm lint

# Run tests
pnpm test:run

# Run tests with coverage
pnpm test:coverage
```

## Build

```bash
pnpm build:win    # Windows (NSIS installer)
pnpm build:mac    # macOS (DMG)
pnpm build:linux  # Linux (AppImage + deb)
```

## Providers

| Role            | Provider  | Models                                                                                            |
| --------------- | --------- | ------------------------------------------------------------------------------------------------- |
| Transcription   | Groq      | `whisper-large-v3-turbo` (default), `whisper-large-v3`                                            |
| Transcription   | OpenAI    | `gpt-4o-mini-transcribe` (default), `gpt-4o-transcribe`, `gpt-4o-transcribe-diarize`, `whisper-1` |
| Post-processing | Anthropic | `claude-haiku-4-5` (default), `claude-sonnet-4-6`, `claude-opus-4-7`                              |
| Post-processing | OpenAI    | `gpt-5.4-mini` (default), `gpt-5.4`, `gpt-5.5`                                                    |

### Documentation

- Groq speech-to-text: https://console.groq.com/docs/speech-to-text
- OpenAI speech-to-text: https://developers.openai.com/api/docs/guides/speech-to-text
