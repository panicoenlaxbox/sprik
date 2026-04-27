# Language

All code must be in English — including comments, user-facing messages, log strings, and error text.

# Checks

After every change, run `pnpm format && pnpm typecheck && pnpm lint && pnpm test:run` — all must pass with zero errors and warnings.

# Logging

- **main**: use `log(scope, message, level)` from `src/main/logger.ts` — never `console.*`
- **renderer/worker**: use `window.workerApi.log(scope, message, level)` — never `console.*`
- **other renderers / preload**: `console.*` is fine
