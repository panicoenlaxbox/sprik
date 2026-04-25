# Murmur

Press a hotkey, speak, get text — pasted where you need it.

Murmur is a cross-platform desktop app that transcribes speech to text using
[OpenAI Whisper](https://platform.openai.com/docs/guides/speech-to-text) or
[Groq](https://console.groq.com/), with optional post-processing via an LLM
(Claude or GPT-4o). Lives in the system tray, no window in your way.

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

For development, copy `.env.example` to `.env.local` and add your API keys:

```bash
cp .env.example .env.local
```

## Usage

```bash
# Development (hot reload)
pnpm dev

# Run tests
pnpm test:run

# Run tests with coverage
pnpm test:coverage

# Type check
pnpm typecheck
```

## Build

```bash
pnpm build:win    # Windows (NSIS installer)
pnpm build:mac    # macOS (DMG)
pnpm build:linux  # Linux (AppImage + deb)
```

## Providers

| Role | Provider | Models |
|---|---|---|
| Transcription | Groq | `whisper-large-v3-turbo` (default), `whisper-large-v3`, `distil-whisper-large-v3-en` |
| Transcription | OpenAI | `whisper-1` |
| Post-processing | Anthropic | `claude-sonnet-4-6` (default) |
| Post-processing | OpenAI | `gpt-4o-mini` (default) |

## IDE Setup

[VS Code](https://code.visualstudio.com/) with the
[ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) and
[Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
extensions (both recommended in `.vscode/extensions.json`).
