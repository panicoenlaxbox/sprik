# Language

All code must be in English — including comments, user-facing messages, log strings, and error text.

# Checks

After every change, run `pnpm format && pnpm typecheck && pnpm lint && pnpm test:run` — all must pass with zero errors and warnings.

# ASCII vs Unicode

Use only ASCII characters in any string that may appear in terminal, logs, test output, or console:
- Ellipsis: `...` not `…` (U+2026)
- Em dash: ` - ` not `—` (U+2014)
- Arrows: `->` / `<-` not `→` / `←`

UI-only strings rendered exclusively in the browser (placeholders, labels, notification titles, etc) may use Unicode.

# Logging

- **main**: use `log(scope, message, level)` from `src/main/logger.ts` — never `console.*`
- **renderer/worker**: use `window.workerApi.log(scope, message, level)` — never `console.*`
- **other renderers / preload**: `console.*` is fine
