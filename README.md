# Sprik

Press a hotkey, speak, get text — pasted where you need it.

Sprik is a cross-platform desktop app that transcribes speech to text,
with optional post-processing via an LLM. Lives in the system tray, no window in your way.

## Features

- **Global hotkey** — press once to start recording, press again to stop and transcribe (`Ctrl+Alt+Space` by default, rebindable); cancel by clicking the overlay's X, or bind an optional cancel hotkey (none by default, since a global accelerator is swallowed system-wide while recording)
- **Auto-paste** — result lands directly where your cursor is; falls back to clipboard with a notification if paste is unavailable
- **Transcription providers** — Groq, OpenAI, and Azure (Microsoft Foundry)
- **Post-processing** — optional LLM cleanup pass via Anthropic, OpenAI, or Azure; prompt is fully customizable
- **History** — searchable log of past transcriptions with timestamps, provider info, and audio duration; configurable retention limit
- **Overlay** — floating indicator showing recording / transcribing / processing state with an optional live timer
- **Theme** — system, light, or dark
- **Language** — English or Spanish (or system default) for transcription
- **Autostart** — optional launch at login (Windows, macOS, Linux)
- **Encrypted key storage** — API keys stored via Electron `safeStorage`, never in plain text; falls back to environment variables

## Development

### Requirements

- Node ≥ 20 (22 LTS recommended)
- pnpm
- An API key for at least one AI provider

### Setup

```bash
pnpm install
```

Copy `.env.example` to `.env.local` and add your API keys.

### Scripts

```bash
pnpm dev           # Development with hot reload
pnpm format        # Format
pnpm typecheck     # Type check
pnpm lint          # Lint
pnpm test:run      # Run tests
pnpm test:coverage # Run tests with coverage
```

### Build

```bash
pnpm build:win    # Windows (NSIS installer)
pnpm build:mac    # macOS (DMG)
pnpm build:linux  # Linux (AppImage + deb)
```
