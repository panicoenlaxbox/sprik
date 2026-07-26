import { app } from 'electron'
import { join } from 'path'
import { writeFileSync, unlinkSync, existsSync } from 'fs'
import { CHANNELS, type OverlayState, type RecordingAudioPayload } from './ipc'
import { log } from './logger'
import { SCOPES } from '../shared/scopes'

export type RecordingState = 'idle' | 'starting' | 'recording' | 'stopping' | 'error'

/**
 * When to log that the microphone is taking abnormally long to open. Opening a
 * cold audio device has been measured at up to ~17 s and there is no way to
 * tell a slow open from a stuck one, so this never aborts the attempt - the
 * overlay keeps showing `starting` with a running timer and the user decides
 * whether to cancel.
 */
export const MIC_START_WARN_MS = 20_000

export interface WorkerBridge {
  send(channel: string, payload?: unknown): void
  onAudio(cb: (payload: RecordingAudioPayload) => void): void
  onError(cb: (error: string) => void): void
  onStarted(cb: () => void): void
  onAborted(cb: () => void): void
}

export interface OverlayBridge {
  setState(state: OverlayState): void
}

export interface TranscribePipeline {
  run(
    audioPath: string,
    durationMs?: number,
    microphone?: string,
    signal?: AbortSignal
  ): Promise<void>
}

export class RecordingOrchestrator {
  private state: RecordingState = 'idle'
  private tempPath: string | null = null
  private cancelledTimer: ReturnType<typeof setTimeout> | null = null
  private micTimer: ReturnType<typeof setTimeout> | null = null
  private abortController: AbortController | null = null

  constructor(
    private readonly worker: WorkerBridge,
    private readonly overlay: OverlayBridge,
    private readonly pipeline?: TranscribePipeline,
    private readonly onIdle?: () => void
  ) {
    worker.onAudio((payload) => {
      this.handleAudio(payload).catch((e: unknown) =>
        log(SCOPES.recording, e instanceof Error ? e.message : String(e), 'error')
      )
    })
    worker.onError((err) => this.handleError(err))
    worker.onStarted(() => this.handleStarted())
    worker.onAborted(() => this.handleAborted())
  }

  toggle(deviceId?: string): void {
    if (this.state === 'idle') {
      this.start(deviceId)
    } else if (this.state === 'starting') {
      // The microphone is still opening, so there is no audio to keep. Abort
      // instead of pretending a recording is being transcribed.
      log(SCOPES.recording, 'toggle while microphone was still opening; aborting', 'warn')
      this.cancel()
    } else if (this.state === 'recording') {
      this.stop()
    }
  }

  start(deviceId?: string): void {
    if (this.state !== 'idle') return
    if (this.cancelledTimer) {
      clearTimeout(this.cancelledTimer)
      this.cancelledTimer = null
    }
    this.state = 'starting'
    this.overlay.setState('starting')
    this.worker.send(CHANNELS.RECORDING_START, deviceId)
    this.micTimer = setTimeout(() => {
      this.micTimer = null
      if (this.state !== 'starting') return
      log(
        SCOPES.recording,
        `microphone still not open after ${MIC_START_WARN_MS}ms; still waiting`,
        'warn'
      )
    }, MIC_START_WARN_MS)
  }

  stop(): void {
    if (this.state !== 'recording') return
    this.state = 'stopping'
    this.overlay.setState('transcribing')
    this.worker.send(CHANNELS.RECORDING_STOP)
  }

  cancel(): void {
    if (this.state === 'idle') return
    this.clearMicTimer()
    this.abortController?.abort()
    this.worker.send(CHANNELS.RECORDING_CANCEL)
    this.deleteTempFile()
    this.state = 'idle'
    this.overlay.setState('cancelled')
    this.onIdle?.()
    this.cancelledTimer = setTimeout(() => {
      this.cancelledTimer = null
      this.overlay.setState('idle')
    }, 1500)
  }

  getState(): RecordingState {
    return this.state
  }

  getTempPath(): string | null {
    return this.tempPath
  }

  deleteTempFile(): void {
    if (this.tempPath && existsSync(this.tempPath)) {
      unlinkSync(this.tempPath)
    }
    this.tempPath = null
  }

  private async handleAudio(payload: RecordingAudioPayload): Promise<void> {
    const tempDir = app.getPath('temp')
    this.tempPath = join(tempDir, `sprik-${Date.now()}.webm`)
    writeFileSync(this.tempPath, payload.buffer)
    log(SCOPES.recording, `saved ${this.tempPath} (${payload.durationMs}ms)`)

    if (this.state === 'idle') {
      this.deleteTempFile()
      return
    }

    if (this.pipeline) {
      this.abortController = new AbortController()
      try {
        await this.pipeline.run(
          this.tempPath,
          payload.durationMs,
          payload.microphone,
          this.abortController.signal
        )
        if (this.getState() !== 'idle') {
          this.deleteTempFile()
          this.reset()
        }
      } catch {
        if (this.getState() !== 'idle') {
          this.deleteTempFile()
          this.showError()
        }
      }
    } else {
      this.reset()
    }
  }

  private handleStarted(): void {
    this.clearMicTimer()
    if (this.state !== 'starting') return
    this.state = 'recording'
    this.overlay.setState('recording')
  }

  /** The worker got a mic stream after a stop/cancel and threw it away. */
  private handleAborted(): void {
    this.clearMicTimer()
    if (this.state === 'idle') return
    log(SCOPES.recording, 'worker aborted the start; nothing was recorded', 'warn')
    this.deleteTempFile()
    this.reset()
  }

  private handleError(error: string): void {
    log(SCOPES.recording, `worker error: ${error}`, 'error')
    this.clearMicTimer()
    this.deleteTempFile()
    this.reset()
  }

  private clearMicTimer(): void {
    if (this.micTimer) {
      clearTimeout(this.micTimer)
      this.micTimer = null
    }
  }

  private showError(): void {
    this.state = 'error'
    this.overlay.setState('error')
    this.onIdle?.()
    void setTimeout(() => {
      this.state = 'idle'
      this.overlay.setState('idle')
    }, 1500)
  }

  private reset(): void {
    this.state = 'idle'
    this.overlay.setState('idle')
    this.onIdle?.()
  }
}
