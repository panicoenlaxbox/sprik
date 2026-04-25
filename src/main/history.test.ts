import {
  appendEntry,
  getEntries,
  deleteEntry,
  clearEntries,
  exportEntries,
  type HistoryEntry
} from './history'
import { rmSync, existsSync } from 'fs'

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  rmSync: vi.fn()
}))

let storeData: Record<string, unknown> = {}

vi.mock('electron-store', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn((key: string, defaultValue?: unknown) =>
      storeData[key] !== undefined ? storeData[key] : defaultValue
    ),
    set: vi.fn((key: string, value: unknown) => {
      storeData[key] = value
    })
  }))
}))

beforeEach(() => {
  storeData = {}
})

const entryData = {
  processed: 'Hello world',
  transcription: { provider: 'groq', model: 'whisper-large-v3-turbo' }
}

describe('appendEntry', () => {
  it('stores a new entry with generated id and ISO timestamp', () => {
    appendEntry(entryData, 100)
    const entries = getEntries() as HistoryEntry[]

    expect(entries).toHaveLength(1)
    expect(entries[0].processed).toBe('Hello world')
    expect(entries[0].transcription.provider).toBe('groq')
    expect(entries[0].id).toMatch(/^[0-9a-f-]{36}$/)
    expect(entries[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('prepends new entries so most recent comes first', () => {
    appendEntry({ ...entryData, processed: 'First' }, 100)
    appendEntry({ ...entryData, processed: 'Second' }, 100)
    const entries = getEntries() as HistoryEntry[]

    expect(entries[0].processed).toBe('Second')
    expect(entries[1].processed).toBe('First')
  })

  it('trims to the retain limit', () => {
    for (let i = 0; i < 5; i++) {
      appendEntry({ ...entryData, processed: `Entry ${i}` }, 3)
    }

    expect(getEntries()).toHaveLength(3)
  })

  it('removes files of entries evicted by the retain limit', () => {
    const evictedPath = '/recordings/old'
    appendEntry({ ...entryData, path: evictedPath }, 2)
    appendEntry(entryData, 2)

    appendEntry(entryData, 2) // pushes evictedPath entry out

    expect(existsSync).toHaveBeenCalledWith(evictedPath)
    expect(rmSync).toHaveBeenCalledWith(evictedPath, { recursive: true, force: true })
  })
})

describe('deleteEntry', () => {
  it('removes the entry with the given id', () => {
    appendEntry(entryData, 100)
    const id = (getEntries() as HistoryEntry[])[0].id

    deleteEntry(id)

    expect(getEntries()).toHaveLength(0)
  })

  it('leaves other entries untouched', () => {
    appendEntry({ ...entryData, processed: 'Keep' }, 100)
    appendEntry({ ...entryData, processed: 'Delete me' }, 100)
    const id = (getEntries() as HistoryEntry[])[0].id

    deleteEntry(id)

    const remaining = getEntries() as HistoryEntry[]
    expect(remaining).toHaveLength(1)
    expect(remaining[0].processed).toBe('Keep')
  })
})

describe('clearEntries', () => {
  it('empties the history', () => {
    appendEntry(entryData, 100)
    appendEntry(entryData, 100)

    clearEntries()

    expect(getEntries()).toHaveLength(0)
  })
})

describe('exportEntries', () => {
  it('returns valid JSON containing all entries', () => {
    appendEntry(entryData, 100)

    const parsed = JSON.parse(exportEntries()) as HistoryEntry[]

    expect(parsed).toHaveLength(1)
    expect(parsed[0].processed).toBe('Hello world')
  })

  it('returns an empty array when history is empty', () => {
    expect(JSON.parse(exportEntries())).toEqual([])
  })
})
