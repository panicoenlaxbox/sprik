import { overlayStateSchema, recordingAudioPayloadSchema, apiProviderSchema, setKeyPayloadSchema } from './ipc'

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

describe('apiProviderSchema', () => {
  it('accepts valid providers', () => {
    expect(apiProviderSchema.parse('openai')).toBe('openai')
    expect(apiProviderSchema.parse('groq')).toBe('groq')
    expect(apiProviderSchema.parse('anthropic')).toBe('anthropic')
  })

  it('rejects unknown providers', () => {
    expect(() => apiProviderSchema.parse('cohere')).toThrow()
    expect(() => apiProviderSchema.parse('')).toThrow()
  })
})

describe('setKeyPayloadSchema', () => {
  it('accepts a valid provider and non-empty key', () => {
    const result = setKeyPayloadSchema.parse({ provider: 'groq', key: 'gsk-abc123' })
    expect(result.provider).toBe('groq')
    expect(result.key).toBe('gsk-abc123')
  })

  it('rejects an empty key string', () => {
    expect(() => setKeyPayloadSchema.parse({ provider: 'openai', key: '' })).toThrow()
  })

  it('rejects an unknown provider', () => {
    expect(() => setKeyPayloadSchema.parse({ provider: 'mistral', key: 'key' })).toThrow()
  })
})
