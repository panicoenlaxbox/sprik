import { existsSync } from 'fs'
import { RecordingOrchestrator, type WorkerBridge, type OverlayBridge } from './recording'
import { CHANNELS, type OverlayState, type RecordingAudioPayload } from './ipc'

function makeWorkerBridge(): WorkerBridge & { triggerAudio: (p: RecordingAudioPayload) => void; triggerError: (e: string) => void } {
  const audioCallbacks: Array<(p: RecordingAudioPayload) => void> = []
  const errorCallbacks: Array<(e: string) => void> = []

  return {
    send: vi.fn(),
    onAudio: (cb) => audioCallbacks.push(cb),
    onError: (cb) => errorCallbacks.push(cb),
    triggerAudio: (p) => audioCallbacks.forEach((cb) => cb(p)),
    triggerError: (e) => errorCallbacks.forEach((cb) => cb(e))
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
    it('transitions idle → recording when start() is called', () => {
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const orc = new RecordingOrchestrator(worker, overlay)

      orc.start()

      expect(orc.getState()).toBe('recording')
      expect(worker.send).toHaveBeenCalledWith(CHANNELS.RECORDING_START)
      expect(overlay.states).toContain('recording')
    })

    it('sends stop to worker and sets overlay to transcribing when stop() is called', () => {
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const orc = new RecordingOrchestrator(worker, overlay)

      orc.start()
      orc.stop()

      expect(worker.send).toHaveBeenCalledWith(CHANNELS.RECORDING_STOP)
      expect(overlay.states).toContain('transcribing')
    })

    it('saves audio to temp file and resets to idle after receiving audio', () => {
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const orc = new RecordingOrchestrator(worker, overlay)

      orc.start()
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
      expect(orc.getState()).toBe('recording')

      orc.toggle()
      expect(worker.send).toHaveBeenLastCalledWith(CHANNELS.RECORDING_STOP)
    })
  })

  describe('cancel flow', () => {
    it('sends cancel to worker and resets to idle', () => {
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const orc = new RecordingOrchestrator(worker, overlay)

      orc.start()
      orc.cancel()

      expect(worker.send).toHaveBeenCalledWith(CHANNELS.RECORDING_CANCEL)
      expect(orc.getState()).toBe('idle')
      expect(overlay.states.at(-1)).toBe('idle')
    })

    it('does nothing when cancel() is called while idle', () => {
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const orc = new RecordingOrchestrator(worker, overlay)

      orc.cancel()

      expect(worker.send).not.toHaveBeenCalled()
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

  describe('guard conditions', () => {
    it('start() is a no-op when already recording', () => {
      const worker = makeWorkerBridge()
      const overlay = makeOverlayBridge()
      const orc = new RecordingOrchestrator(worker, overlay)

      orc.start()
      orc.start()

      expect(vi.mocked(worker.send).mock.calls.filter((c) => c[0] === CHANNELS.RECORDING_START)).toHaveLength(1)
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
