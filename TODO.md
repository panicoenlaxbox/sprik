# TODO: Diagnose first-recording latency / overlay not appearing

## Problem (reported by user)

When starting a recording via the global shortcut for the **first time after the app
has been idle in the tray for a while** (not necessarily right after Windows boot -
often an hour or more into the session), there is an erratic delay. Sometimes the
user "sees nothing": the recording overlay (the pill that shows `Recording...`,
`Transcribing...`, etc.) does not appear promptly, so the user cannot tell whether it
is recording. The user's visual "is it recording?" signal IS that overlay.

Historical workaround the user found: open the main window from the tray and close it
again, then the shortcut works fast. (Likely just buys time / bumps process priority.)

## What we already established (from code + old app.log)

- The recording flow: shortcut -> `onToggle` (main) -> `orchestrator.start()` sets the
  overlay state FIRST, then sends `RECORDING_START` to the hidden worker window, which
  calls `navigator.mediaDevices.getUserMedia()`.
  - `src/main/index.ts` (onToggle, shortcutHandlers), `src/main/recording.ts`
    (`start()`), `src/renderer/worker/index.ts` (`startRecording`).
- Confirmed: the worker reacts to the shortcut in ~8 ms even when "slow"; the whole
  erratic delay historically sat INSIDE `getUserMedia` (mic/audio device cold start,
  0.5 s up to ~7 s), i.e. the OS/Chromium audio capture device going cold after idle.
- The "shortcut not registered yet" theory only explains the case immediately after
  Windows boot (registration is gated on the worker window's `did-finish-load`). It
  does NOT explain the user's real case (an hour into the session).
- Still OPEN: the "I see nothing" / overlay-appearance part. The old logs could not
  measure it because the `overlay state = X` line is written by MAIN at send time, not
  when the overlay actually paints.

## Instrumentation added (this is what the new logs give us)

Per shortcut press, `app.log` should contain (scope in parentheses):

```
(shortcuts) toggle fired                                   # global shortcut handler ran (absent => press was ignored / not registered)
(shortcuts) worker loaded; shortcuts registered (...)      # startup only: when the shortcut became live
(overlay)   state = recording                              # MAIN sends the state
(overlay)   received recording                             # overlay renderer received the IPC
(worker)    startRecording called                          # worker renderer received IPC, about to call getUserMedia
(overlay)   painted recording                              # overlay actually painted (double requestAnimationFrame)
(worker)    got mic stream                                 # getUserMedia resolved
(worker)    mediaRecorder started                          # recording actually started
```

Files: `src/main/index.ts`, `src/renderer/overlay/App.tsx`,
`src/renderer/worker/index.ts`, plus `src/preload/index.ts` +
`src/renderer/shared/types.ts` (gave the overlay a `window.api.log(...)` that reuses
the `LOG_WORKER` channel so it can write to `app.log`).

## How to analyze (next session)

Use the millisecond timestamps in `app.log` (`%APPDATA%\sprik\app.log`). The in-app
Logs viewer now also shows milliseconds. Do NOT rely on a console paste (no timestamps)
or second-only precision - the gaps of interest are sub-second.

Find the slow case: the first recording after a long idle gap (large time gap before
`toggle fired`), or the entry near the wall-clock time the user says it felt slow.

Compute these gaps for that press and attribute the delay:

1. **Overlay slow to appear** -> big gap `state = recording` -> `painted recording`
   (or `received recording` -> `painted recording` for pure paint time). This is the
   "I see nothing" hypothesis.
2. **Mic cold start** -> big gap `startRecording called` -> `got mic stream`.
3. **Pre-handler delay (blind spot)** -> all logged gaps are small yet the user felt it
   slow => the latency is BEFORE `toggle fired` (OS delivering the global shortcut /
   the main process waking from an OS-throttled/suspended state). We cannot timestamp
   the physical keypress, so this is diagnosed by elimination.

Note on trust: timestamps are stamped by MAIN when it receives each log. Gaps between
two SAME-origin renderer events (`received`->`painted`, or `startRecording`->`got mic
stream`) are clean because the logging-IPC overhead cancels out.

## What to collect from the user

- `app.log` (the file), and `app.old.log` if it exists (electron-log rotates at ~1 MB).
- Approximate wall-clock time of a moment it felt slow (optional but helpful).
- User plans to clear `app.log` (app closed) before this run to start from empty.

## Candidate fixes (only after diagnosis confirms the cause)

- If mic cold start: keep the audio pipeline warm. Tradeoff - the Windows mic-in-use
  indicator turns on whenever the capture device is open, so a permanent warm stream is
  intrusive for a tray app. Options discussed: silent output `AudioContext` keep-warm
  (no indicator, may not fully warm the input device), warm-up at startup (helps only
  the first recording of a session, not after later idle), periodic brief warm-ups
  (keeps device awake but may blink the indicator).
- If overlay paint: investigate the transparent always-on-top overlay window's
  compositing / `backgroundThrottling` on the overlay (and worker) windows in
  `src/main/windows.ts`; consider keeping the pill mounted (hidden) instead of rendering
  `<></>` when idle so the surface stays warm.
- If pre-handler: main-process wake / OS throttling - hardest; investigate whether the
  main process is being suspended by Windows when idle.

## Environment note

Running `pnpm <script>` here triggers a node_modules reinstall (verify-deps-before-run)
which, combined with the user's `ignore-scripts=true` (kept for SECURITY - do not
disable), can break the Electron binary. See the memory file
`dev-env-electron-provisioning` for how to run checks directly and restore Electron
without touching the security setting.
