import { overlayStateSchema, recordingAudioPayloadSchema } from './ipc'

describe('overlayStateSchema', () => {
  it('accepts valid states', () => {
    expect(overlayStateSchema.parse('idle')).toBe('idle')
    expect(overlayStateSchema.parse('recording')).toBe('recording')
    expect(overlayStateSchema.parse('transcribing')).toBe('transcribing')
  })

  it('rejects unknown states', () => {
    expect(() => overlayStateSchema.parse('paused')).toThrow()
    expect(() => overlayStateSchema.parse('')).toThrow()
  })
})

describe('recordingAudioPayloadSchema', () => {
  it('accepts a valid payload', () => {
    const result = recordingAudioPayloadSchema.parse({ durationMs: 3200 })
    expect(result.durationMs).toBe(3200)
  })

  it('rejects negative duration', () => {
    expect(() => recordingAudioPayloadSchema.parse({ durationMs: -1 })).toThrow()
  })

  it('rejects missing durationMs', () => {
    expect(() => recordingAudioPayloadSchema.parse({})).toThrow()
  })
})
