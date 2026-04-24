import { getPostProcessor, listPostProcessors } from './index'

describe('getPostProcessor', () => {
  it('returns the anthropic processor for "anthropic"', () => {
    expect(getPostProcessor('anthropic').id).toBe('anthropic')
  })

  it('returns the openai processor for "openai"', () => {
    expect(getPostProcessor('openai').id).toBe('openai')
  })

  it('throws for an unknown provider', () => {
    expect(() => getPostProcessor('unknown')).toThrow('Unknown post-processor')
  })
})

describe('listPostProcessors', () => {
  it('returns all registered processors', () => {
    const ids = listPostProcessors().map((p) => p.id)
    expect(ids).toContain('anthropic')
    expect(ids).toContain('openai')
  })
})
