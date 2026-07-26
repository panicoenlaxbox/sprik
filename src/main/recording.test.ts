import { existsSync } from 'fs'
import { app } from 'electron'
import {
  RecordingOrchestrator,
  MIC_START_WARN_MS,
  type WorkerBridge,
  type OverlayBridge
} from './recording'
import { CHANNELS, type OverlayState, type RecordingAudioPayload } from './ipc'

function makeWorkerBridge(): WorkerBridge & {
  triggerAudio: (p: RecordingAudioPayload) => void
  triggerError: (e: string) => void
  triggerStarted: () => void
  triggerAborted: () => void
} {
  const audioCallbacks: Array<(p: RecordingAudioPayload) => void> = []
  const errorCallbacks: Array<(e: string) => void> = []
  const startedCallbacks: Array<() => void> = []
  const abortedCallbacks: Array<() => void> = []

  return {
    send: vi.fn(),
    onAudio: (cb) => audioCallbacks.push(cb),
    onError: (cb) => errorCallbacks.push(cb),
    onStarted: (cb) => startedCallbacks.push(cb),
    onAborted: (cb) => abortedCallbacks.push(cb),
    triggerAudio: (p) => audioCallbacks.forEach((cb) => cb(p)),
    triggerError: (e) => errorCallbacks.forEach((cb) => cb(e)),
    triggerStarted: () => startedCallbacks.forEach((cb) => cb()),
    triggerAborted: () => abortedCallbacks.forEach((cb) => cb())
  }
}

function makeOverlayBridge(): OverlayBridge & { states: OverlayState[] } {
  const states: OverlayState[] = []
  return {
    setState: (s) => states.push(s),
    states
  }
}

describe('RecordingOrchestrator', () => {
  describe('start / stop flow (happy path)', () => {
    it('transitions idle -> starting when start() is called', () => {
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const orc = new RecordingOrchestrator(worker, overlay)

      orc.start()

      expect(orc.getState()).toBe('starting')
      expect(worker.send).toHaveBeenCalledWith(CHANNELS.RECORDING_START, undefined)
      expect(overlay.states).toContain('starting')
      expect(overlay.states).not.toContain('recording')
    })

    it('transitions starting -> recording only once the worker confirms the mic is open', () => {
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const orc = new RecordingOrchestrator(worker, overlay)

      orc.start()
      worker.triggerStarted()

      expect(orc.getState()).toBe('recording')
      expect(overlay.states.at(-1)).toBe('recording')
    })

    it('sends stop to worker and sets overlay to transcribing when stop() is called', () => {
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const orc = new RecordingOrchestrator(worker, overlay)

      orc.start()
      worker.triggerStarted()
      orc.stop()

      expect(worker.send).toHaveBeenCalledWith(CHANNELS.RECORDING_STOP)
      expect(overlay.states).toContain('transcribing')
    })

    it('saves audio to temp file and resets to idle after receiving audio', () => {
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const orc = new RecordingOrchestrator(worker, overlay)

      orc.start()
      worker.triggerStarted()
      orc.stop()
      worker.triggerAudio({ buffer: Buffer.from('fake-audio'), durationMs: 1500 })

      expect(orc.getState()).toBe('idle')
      expect(orc.getTempPath()).not.toBeNull()
      expect(existsSync(orc.getTempPath()!)).toBe(true)
      expect(overlay.states.at(-1)).toBe('idle')

      orc.deleteTempFile()
    })

    it('toggle() alternates between start and stop', () => {
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const orc = new RecordingOrchestrator(worker, overlay)

      orc.toggle()
      expect(orc.getState()).toBe('starting')
      worker.triggerStarted()
      expect(orc.getState()).toBe('recording')

      orc.toggle()
      expect(worker.send).toHaveBeenLastCalledWith(CHANNELS.RECORDING_STOP)
    })
  })

  describe('slow microphone start', () => {
    it('toggle() while still starting aborts instead of waiting for audio forever', () => {
      vi.useFakeTimers()
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const orc = new RecordingOrchestrator(worker, overlay)

      orc.toggle()
      orc.toggle()

      expect(worker.send).toHaveBeenLastCalledWith(CHANNELS.RECORDING_CANCEL)
      expect(worker.send).not.toHaveBeenCalledWith(CHANNELS.RECORDING_STOP)
      expect(orc.getState()).toBe('idle')
      expect(overlay.states.at(-1)).toBe('cancelled')
      expect(overlay.states).not.toContain('transcribing')

      vi.useRealTimers()
    })

    it('stop() is a no-op while the mic is still opening', () => {
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const orc = new RecordingOrchestrator(worker, overlay)

      orc.start()
      orc.stop()

      expect(worker.send).not.toHaveBeenCalledWith(CHANNELS.RECORDING_STOP)
      expect(orc.getState()).toBe('starting')
    })

    it('keeps waiting (does not abort) when the mic takes longer than the warn threshold', () => {
      vi.useFakeTimers()
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const orc = new RecordingOrchestrator(worker, overlay)

      orc.start()
      vi.advanceTimersByTime(MIC_START_WARN_MS + 1000)

      expect(orc.getState()).toBe('starting')
      expect(overlay.states.at(-1)).toBe('starting')

      worker.triggerStarted()
      expect(orc.getState()).toBe('recording')

      vi.useRealTimers()
    })

    it('returns to idle when the worker reports it discarded a late mic stream', () => {
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const onIdle = vi.fn()
      const orc = new RecordingOrchestrator(worker, overlay, undefined, onIdle)

      orc.start()
      worker.triggerAborted()

      expect(orc.getState()).toBe('idle')
      expect(overlay.states.at(-1)).toBe('idle')
      expect(onIdle).toHaveBeenCalledOnce()
    })

    it('ignores a late started confirmation that arrives after cancel', () => {
      vi.useFakeTimers()
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const orc = new RecordingOrchestrator(worker, overlay)

      orc.start()
      orc.cancel()
      worker.triggerStarted()

      expect(orc.getState()).toBe('idle')
      expect(overlay.states).not.toContain('recording')

      vi.useRealTimers()
    })
  })

  describe('cancel flow', () => {
    it('sends cancel to worker, shows cancelled state briefly, then idles', () => {
      vi.useFakeTimers()
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const orc = new RecordingOrchestrator(worker, overlay)

      orc.start()
      orc.cancel()

      expect(worker.send).toHaveBeenCalledWith(CHANNELS.RECORDING_CANCEL)
      expect(orc.getState()).toBe('idle')
      expect(overlay.states.at(-1)).toBe('cancelled')

      vi.advanceTimersByTime(1500)
      expect(overlay.states.at(-1)).toBe('idle')

      vi.useRealTimers()
    })

    it('starting a new recording during the cancelled window clears the timer', () => {
      vi.useFakeTimers()
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const orc = new RecordingOrchestrator(worker, overlay)

      orc.start()
      orc.cancel()
      expect(overlay.states.at(-1)).toBe('cancelled')

      orc.start()
      worker.triggerStarted()
      expect(overlay.states.at(-1)).toBe('recording')

      vi.advanceTimersByTime(1500)
      expect(overlay.states.at(-1)).toBe('recording')

      vi.useRealTimers()
    })

    it('does nothing when cancel() is called while idle', () => {
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const orc = new RecordingOrchestrator(worker, overlay)

      orc.cancel()

      expect(worker.send).not.toHaveBeenCalled()
    })

    it('aborts the pipeline and does not call reset when cancelled while pipeline is running', async () => {
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      let capturedSignal: AbortSignal | undefined
      const pipeline = {
        run: vi.fn(async (_path: string, _dur?: number, _mic?: string, signal?: AbortSignal) => {
          capturedSignal = signal
          await new Promise<void>((resolve) => setTimeout(resolve, 100))
          if (signal?.aborted) return
        })
      }
      const onIdle = vi.fn()
      const orc = new RecordingOrchestrator(worker, overlay, pipeline, onIdle)

      vi.useFakeTimers()
      orc.start()
      worker.triggerStarted()
      orc.stop()
      worker.triggerAudio({ buffer: Buffer.from('fake'), durationMs: 500 })

      orc.cancel()
      expect(capturedSignal?.aborted).toBe(true)
      expect(orc.getState()).toBe('idle')

      await vi.runAllTimersAsync()

      expect(overlay.states.filter((s) => s === 'idle')).toHaveLength(1)
      expect(onIdle).toHaveBeenCalledOnce()

      vi.useRealTimers()
    })

    it('does not paste or reset when audio arrives after cancel', async () => {
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const pipeline = { run: vi.fn().mockResolvedValue(undefined) }
      const onIdle = vi.fn()
      const orc = new RecordingOrchestrator(worker, overlay, pipeline, onIdle)

      orc.start()
      orc.cancel()
      expect(orc.getState()).toBe('idle')

      worker.triggerAudio({ buffer: Buffer.from('fake'), durationMs: 500 })
      await Promise.resolve()

      expect(pipeline.run).not.toHaveBeenCalled()
      expect(onIdle).toHaveBeenCalledOnce()
    })
  })

  describe('error handling', () => {
    it('resets to idle and clears temp file when worker reports an error', () => {
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const orc = new RecordingOrchestrator(worker, overlay)

      orc.start()
      worker.triggerError('microphone denied')

      expect(orc.getState()).toBe('idle')
      expect(orc.getTempPath()).toBeNull()
      expect(overlay.states.at(-1)).toBe('idle')
    })
  })

  describe('onIdle callback', () => {
    it('calls onIdle when recording resets to idle after audio is received', () => {
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const onIdle = vi.fn()
      const orc = new RecordingOrchestrator(worker, overlay, undefined, onIdle)

      orc.start()
      worker.triggerAudio({ buffer: Buffer.from('fake'), durationMs: 500 })

      expect(onIdle).toHaveBeenCalledOnce()
      orc.deleteTempFile()
    })

    it('calls onIdle when cancel resets to idle', () => {
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const onIdle = vi.fn()
      const orc = new RecordingOrchestrator(worker, overlay, undefined, onIdle)

      orc.start()
      orc.cancel()

      expect(onIdle).toHaveBeenCalledOnce()
    })
  })

  describe('pipeline integration', () => {
    it('runs pipeline, deletes temp file and resets when pipeline succeeds normally', async () => {
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const pipeline = { run: vi.fn().mockResolvedValue(undefined) }
      const onIdle = vi.fn()
      const orc = new RecordingOrchestrator(worker, overlay, pipeline, onIdle)

      orc.start()
      worker.triggerStarted()
      orc.stop()
      worker.triggerAudio({ buffer: Buffer.from('fake'), durationMs: 200 })
      await Promise.resolve()
      await Promise.resolve()

      expect(pipeline.run).toHaveBeenCalledOnce()
      expect(orc.getState()).toBe('idle')
      expect(onIdle).toHaveBeenCalledOnce()
    })

    it('shows error state and recovers when pipeline throws', async () => {
      vi.useFakeTimers()
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const pipeline = { run: vi.fn().mockRejectedValue(new Error('transcription failed')) }
      const onIdle = vi.fn()
      const orc = new RecordingOrchestrator(worker, overlay, pipeline, onIdle)

      orc.start()
      worker.triggerStarted()
      orc.stop()
      worker.triggerAudio({ buffer: Buffer.from('fake'), durationMs: 200 })
      await Promise.resolve()
      await Promise.resolve()

      expect(orc.getState()).toBe('error')
      expect(overlay.states).toContain('error')
      expect(onIdle).toHaveBeenCalledOnce()

      vi.advanceTimersByTime(1500)
      expect(orc.getState()).toBe('idle')
      expect(overlay.states.at(-1)).toBe('idle')

      vi.useRealTimers()
    })

    it('catches and logs an Error when handleAudio itself rejects', async () => {
      vi.mocked(app.getPath).mockImplementationOnce(() => {
        throw new Error('disk full')
      })
      const worker = makeWorkerBridge()
      const orc = new RecordingOrchestrator(worker, makeOverlayBridge())

      orc.start()
      worker.triggerAudio({ buffer: Buffer.from('x'), durationMs: 10 })
      await Promise.resolve()
    })

    it('catches and logs a non-Error rejection from handleAudio', async () => {
      vi.mocked(app.getPath).mockImplementationOnce(() => {
        throw 'disk full' as unknown
      })
      const worker = makeWorkerBridge()
      const orc = new RecordingOrchestrator(worker, makeOverlayBridge())

      orc.start()
      worker.triggerAudio({ buffer: Buffer.from('x'), durationMs: 10 })
      await Promise.resolve()
    })
  })

  describe('guard conditions', () => {
    it('start() is a no-op when a recording is already in flight', () => {
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const orc = new RecordingOrchestrator(worker, overlay)

      orc.start()
      orc.start()

      expect(
        vi.mocked(worker.send).mock.calls.filter((c) => c[0] === CHANNELS.RECORDING_START)
      ).toHaveLength(1)
    })

    it('stop() is a no-op when idle', () => {
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const orc = new RecordingOrchestrator(worker, overlay)

      orc.stop()

      expect(worker.send).not.toHaveBeenCalled()
    })
  })
})
