# After every change

Run these three checks before reporting a task as done:

```
npm run typecheck
npm run lint
npm run test:run
```

All three must pass with zero errors and zero warnings.

# Logging

Always use `log(scope, message, level)` from [src/main/logger.ts](src/main/logger.ts). Never use `console.*` directly in the main process: `log()` internally calls `console[level]` (visible in DevTools), writes to `app.log`, and forwards to the renderer via IPC.

`console.*` is fine in the renderer (`renderer/`) and preload (`preload/`), where [logger.ts](src/main/logger.ts) is not available.
