import { app } from 'electron'
import { join } from 'path'
import { writeFileSync, unlinkSync, existsSync } from 'fs'
import { CHANNELS, type OverlayState, type RecordingAudioPayload } from './ipc'
import { log } from './logger'

export type RecordingState = 'idle' | 'recording' | 'error'

export interface WorkerBridge {
  send(channel: string, payload?: unknown): void
  onAudio(cb: (payload: RecordingAudioPayload) => void): void
  onError(cb: (error: string) => void): void
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
  private abortController: AbortController | null = null

  constructor(
    private readonly worker: WorkerBridge,
    private readonly overlay: OverlayBridge,
    private readonly pipeline?: TranscribePipeline,
    private readonly onIdle?: () => void
  ) {
    worker.onAudio((payload) => {
      this.handleAudio(payload).catch((e: unknown) =>
        log('recording', e instanceof Error ? e.message : String(e), 'error')
      )
    })
    worker.onError((err) => this.handleError(err))
  }

  toggle(deviceId?: string): void {
    if (this.state === 'idle') {
      this.start(deviceId)
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
    this.state = 'recording'
    this.overlay.setState('recording')
    this.worker.send(CHANNELS.RECORDING_START, deviceId)
  }

  stop(): void {
    if (this.state !== 'recording') return
    this.overlay.setState('transcribing')
    this.worker.send(CHANNELS.RECORDING_STOP)
  }

  cancel(): void {
    if (this.state === 'idle') return
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
    log('recording', `saved ${this.tempPath} (${payload.durationMs}ms)`)

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

  private handleError(error: string): void {
    log('recording', `worker error: ${error}`, 'error')
    this.deleteTempFile()
    this.reset()
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
