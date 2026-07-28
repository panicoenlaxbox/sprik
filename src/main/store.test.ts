import { getConfig, setConfig, configSchema } from './store'

let storeData: Record<string, unknown> = {}

vi.mock('electron-store', () => ({
  default: vi.fn().mockImplementation(() => ({
    get store() {
      return storeData
    },
    set store(v: Record<string, unknown>) {
      storeData = v
    }
  }))
}))

beforeEach(() => {
  storeData = {}
})

describe('getConfig', () => {
  it('returns schema defaults when store is empty', () => {
    const config = getConfig()

    expect(config.shortcuts.toggleRecording).toBe('Ctrl+Alt+Space')
    expect(config.shortcuts.cancelRecording).toBe('')
    expect(config.transcription.provider).toBe('groq')
    expect(config.transcription.model).toBe('whisper-large-v3-turbo')
    expect(config.pasteMode).toBe('clipboard-and-focus')
    expect(config.history.retain).toBe(100)
    expect(config.startup.autostart).toBe(false)
  })

  it('keeps a cancel shortcut that was already stored', () => {
    storeData = { shortcuts: { toggleRecording: 'Ctrl+Alt+Space', cancelRecording: 'Escape' } }

    expect(getConfig().shortcuts.cancelRecording).toBe('Escape')
  })

  it('merges stored values with defaults', () => {
    storeData = { transcription: { provider: 'openai', model: 'whisper-1' } }

    const config = getConfig()

    expect(config.transcription.provider).toBe('openai')
    expect(config.transcription.model).toBe('whisper-1')
    expect(config.shortcuts.toggleRecording).toBe('Ctrl+Alt+Space')
  })
})

describe('setConfig', () => {
  it('persists a partial update (top-level section replace)', () => {
    setConfig({ transcription: { provider: 'openai', model: 'whisper-1' } })

    const config = getConfig()
    expect(config.transcription.provider).toBe('openai')
    expect(config.transcription.model).toBe('whisper-1')
    expect(config.shortcuts.toggleRecording).toBe('Ctrl+Alt+Space')
  })

  it('overwrites previous values', () => {
    setConfig({ pasteMode: 'clipboard-only' })
    setConfig({ pasteMode: 'clipboard-and-focus' })

    expect(getConfig().pasteMode).toBe('clipboard-and-focus')
  })

  it('throws and does not save when the schema is violated', () => {
    expect(() =>
      setConfig({ transcription: { provider: 'unknown' as 'openai', model: 'x' } })
    ).toThrow()

    expect(storeData).toEqual({})
  })
})

describe('configSchema', () => {
  it('rejects a negative history retain value', () => {
    expect(() => configSchema.parse({ history: { retain: -1, enabled: true } })).toThrow()
  })

  it('rejects an unknown ui theme', () => {
    expect(() => configSchema.parse({ ui: { theme: 'pink' } })).toThrow()
  })
})

describe('getConfig: rejects invalid stored values', () => {
  it('throws when a stored scalar value fails schema validation', () => {
    storeData = { startup: [true] as unknown as Record<string, unknown> }
    expect(() => getConfig()).toThrow()
  })
})
