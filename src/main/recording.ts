import { app } from 'electron'
import { join } from 'path'
import { writeFileSync, unlinkSync, existsSync } from 'fs'
import { CHANNELS, type OverlayState, type RecordingAudioPayload } from './ipc'

export type RecordingState = 'idle' | 'recording'

export interface WorkerBridge {
  send(channel: string): void
  onAudio(cb: (payload: RecordingAudioPayload) => void): void
  onError(cb: (error: string) => void): void
}

export interface OverlayBridge {
  setState(state: OverlayState): void
}

export interface TranscribePipeline {
  run(audioPath: string): Promise<void>
}

export class RecordingOrchestrator {
  private state: RecordingState = 'idle'
  private tempPath: string | null = null

  constructor(
    private readonly worker: WorkerBridge,
    private readonly overlay: OverlayBridge,
    private readonly pipeline?: TranscribePipeline
  ) {
    worker.onAudio((payload) => { this.handleAudio(payload).catch(console.error) })
    worker.onError((err) => this.handleError(err))
  }

  toggle(): void {
    if (this.state === 'idle') {
      this.start()
    } else {
      this.stop()
    }
  }

  start(): void {
    if (this.state !== 'idle') return
    this.state = 'recording'
    this.overlay.setState('recording')
    this.worker.send(CHANNELS.RECORDING_START)
  }

  stop(): void {
    if (this.state !== 'recording') return
    this.overlay.setState('transcribing')
    this.worker.send(CHANNELS.RECORDING_STOP)
  }

  cancel(): void {
    if (this.state === 'idle') return
    this.worker.send(CHANNELS.RECORDING_CANCEL)
    this.deleteTempFile()
    this.reset()
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
    this.tempPath = join(tempDir, `murmur-${Date.now()}.webm`)
    writeFileSync(this.tempPath, payload.buffer)
    console.log(`[recording] saved ${this.tempPath} (${payload.durationMs}ms)`)

    if (this.pipeline) {
      try {
        await this.pipeline.run(this.tempPath)
      } catch (err) {
        console.error('[recording] pipeline error:', (err as Error).message)
      } finally {
        this.deleteTempFile()
        this.reset()
      }
    } else {
      this.reset()
    }
  }

  private handleError(error: string): void {
    console.error(`[recording] worker error: ${error}`)
    this.deleteTempFile()
    this.reset()
  }

  private reset(): void {
    this.state = 'idle'
    this.overlay.setState('idle')
  }
}
