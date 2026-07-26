# First-recording latency: diagnosed, partially fixed

## Diagnosis (CLOSED) - app.log, 2026-07-26 17:23

The instrumented run reproduced the problem and identified three separate faults.
Timeline of the single press the user reported:

```
17:21:54.328  app starts (0.3.4)
17:21:54.461  shortcuts registered
17:21:54.646  overlay painted idle          <- last frame the overlay produced
--- 67 s idle ---
17:23:02.687  toggle fired                  <- 1st press DID arrive (25 ms to main)
17:23:02.712  state = recording
17:23:02.714  worker startRecording called
17:23:02.721  overlay received recording
              *** no "painted recording" *** <- (1) user saw nothing
17:23:18.359  toggle fired                  <- 2nd press, 15.6 s later
17:23:18.362  state = transcribing
17:23:18.363  overlay received transcribing
17:23:19.826  worker got mic stream         <- (2) getUserMedia took 17.11 s
17:23:19.827  mediaRecorder started         <- (3) started AFTER the stop
17:23:19.884  overlay painted transcribing  <- first frame in 17 s
              *** no "(recording) saved" ***
17:24:46.466  state = cancelled             <- user cancelled, 86 s later
```

1. **Overlay compositor frozen.** The overlay received the IPC in 9 ms but produced
   no frame for 17 s: `requestAnimationFrame` never fired while ordinary tasks (IPC,
   logging) kept running. That is Chromium treating the window as not visible. The
   overlay is a transparent, non-focusable, always-on-top window that rendered `<></>`
   while idle - a completely empty transparent surface - and no window set
   `backgroundThrottling: false`. This also explains the old workaround of opening and
   closing the main window.
2. **Cold microphone: `getUserMedia` took 17.11 s.** Root cause of the real latency
   (previously measured at 0.5-7 s).
3. **Stop-during-start race.** The 2nd press called `stop()` while `getUserMedia` was
   still pending; the worker's `stopRecording()` saw `mediaRecorder === null` and did
   nothing. 1.5 s later the recorder started anyway and recorded orphaned for 87 s with
   the mic open. Main had set the overlay to `transcribing` but never changed its own
   state, so nothing reconciled: no `saved` line, no transcription, no history entry.
   Nothing was ever pasted, and the audio the user spoke was never captured because the
   device was not open yet.

## Fixes applied

Fault 1 - overlay must always paint:

- `app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')` in
  `src/main/index.ts` (before `requestSingleInstanceLock`).
- `backgroundThrottling: false` on the overlay and worker windows (`src/main/windows.ts`).
- The pill stays mounted while idle, hidden with `opacity: 0` + `pointerEvents: none`,
  instead of rendering `<></>` (`src/renderer/overlay/App.tsx`).

Fault 3 - the race, plus honest feedback while the mic opens:

- New overlay state `starting` ("Starting mic..." with its own elapsed timer) sent as
  soon as the shortcut fires. `recording` is only shown once the worker confirms the
  device is open, so the pill no longer claims to be recording while it is not.
  `starting` is cancellable (X button and the cancel shortcut).
- New worker -> main channels `RECORDING_STARTED` / `RECORDING_ABORTED`
  (`src/shared/channels.ts`, `src/shared/worker-channels.ts`, `src/preload/worker.ts`).
- The worker keeps a `session` counter bumped on every start/stop/cancel. A mic stream
  that resolves after a stop is stale: its tracks are stopped, no recorder is created,
  and `sendAborted()` tells main to return to idle
  (`src/renderer/worker/index.ts`).
- Orchestrator states are now `idle | starting | recording | stopping | error`
  (`src/main/recording.ts`). `toggle()` during `starting` aborts cleanly (`cancelled`)
  instead of faking a transcription; `stop()` only acts while `recording` and moves to
  `stopping` so it cannot be sent twice.
- `MIC_START_WARN_MS` (20 s) only logs a warning and keeps waiting. It deliberately does
  NOT abort: a slow open cannot be told apart from a stuck one, and killing an open that
  would have succeeded destroys a good recording. The user decides via cancel.

All four checks pass (`format`, `typecheck`, `lint`, 208 tests).

## Still open: the cold microphone (fault 2)

Nothing here makes `getUserMedia` faster. The first recording after a long idle gap will
still show `Starting mic...` for several seconds (17 s in the worst measured case) and
audio spoken during that window is lost. The user chose honest feedback over keeping the
device warm, because every keep-warm option lights up the Windows mic-in-use indicator:

- permanent warm input stream: instant start, indicator always on (intrusive for a tray app);
- silent-output `AudioContext`: no indicator, may not warm the _input_ device;
- warm-up at startup: only helps the first recording of a session, not after later idle;
- periodic brief warm-ups: keeps the device awake, may blink the indicator.

## How to verify the fixes on the next slow run

The diagnostic log lines were kept on purpose. In `%APPDATA%\sprik\app.log`, per press:

```
(shortcuts) toggle fired
(overlay)   state = starting
(overlay)   received starting
(overlay)   painted starting      <- must now appear within ~tens of ms, even after long idle
(worker)    startRecording called
(worker)    got mic stream        <- the remaining latency lives here
(worker)    mediaRecorder started
(overlay)   state = recording
(overlay)   painted recording
```

- `painted starting` missing or seconds late => the overlay throttling fix is incomplete.
- `got mic stream` still many seconds after `startRecording called` => expected for now;
  that is the open cold-start issue above.
- `mic stream arrived after stop; discarded` (warn) => the race was hit and handled
  correctly; the overlay must go back to idle instead of sticking on `transcribing`.

## Environment note

Running `pnpm <script>` here triggers a node_modules reinstall (verify-deps-before-run)
which, combined with the user's `ignore-scripts=true` (kept for SECURITY - do not
disable), can break the Electron binary. See the memory file
`dev-env-electron-provisioning` for how to run checks directly and restore Electron
without touching the security setting.
