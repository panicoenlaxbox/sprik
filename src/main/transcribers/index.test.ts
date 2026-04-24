import { getTranscriber, listTranscribers } from './index'

describe('getTranscriber', () => {
  it('returns the openai transcriber for "openai"', () => {
    expect(getTranscriber('openai').id).toBe('openai')
  })

  it('returns the groq transcriber for "groq"', () => {
    expect(getTranscriber('groq').id).toBe('groq')
  })

  it('throws for an unknown provider', () => {
    expect(() => getTranscriber('unknown')).toThrow('Unknown transcriber')
  })
})

describe('listTranscribers', () => {
  it('returns all registered transcribers', () => {
    const ids = listTranscribers().map((t) => t.id)
    expect(ids).toContain('openai')
    expect(ids).toContain('groq')
  })
})
