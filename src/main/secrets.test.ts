import { vi } from 'vitest'
import { setKey, getKey, clearKey, getKeyStatus } from './secrets'
import { safeStorage } from 'electron'

let storeData: Record<string, string> = {}

vi.mock('electron-store', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn((key: string) => storeData[key]),
    set: vi.fn((key: string, value: string) => {
      storeData[key] = value
    }),
    delete: vi.fn((key: string) => {
      delete storeData[key]
    })
  }))
}))

beforeEach(() => {
  storeData = {}
  vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true)
})

describe('setKey / getKey round-trip', () => {
  it('encrypts and stores the key, then retrieves it via decrypt', () => {
    setKey('openai', 'sk-test-123')

    expect(safeStorage.encryptString).toHaveBeenCalledWith('sk-test-123')
    expect(getKey('openai')).toBe('sk-test-123')
  })

  it('returns null when no key is stored', () => {
    expect(getKey('groq')).toBeNull()
  })
})

describe('clearKey', () => {
  it('removes the stored key so getKey returns null', () => {
    setKey('groq', 'gsk-abc')
    clearKey('groq')

    expect(getKey('groq')).toBeNull()
  })
})

describe('getKeyStatus', () => {
  it('reflects which keys are currently set', () => {
    setKey('openai', 'sk-x')
    const status = getKeyStatus()

    expect(status.openai).toBe(true)
    expect(status.groq).toBe(false)
    expect(status.anthropic).toBe(false)
  })
})

describe('safeStorage unavailable (fallback)', () => {
  beforeEach(() => {
    vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false)
  })

  it('stores key in memory and retrieves it', () => {
    setKey('anthropic', 'ant-key')
    expect(getKey('anthropic')).toBe('ant-key')
  })

  it('clearing the memory key returns null', () => {
    setKey('anthropic', 'ant-key')
    clearKey('anthropic')
    expect(getKey('anthropic')).toBeNull()
  })
})
