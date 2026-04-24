import { appendEntry, getAllEntries, deleteEntry, clearAll, exportEntries, type HistoryEntry } from './history'

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

const entryData = { text: 'Hello world', provider: 'groq', model: 'whisper-large-v3-turbo' }

describe('appendEntry', () => {
  it('stores a new entry with generated id and ISO timestamp', () => {
    appendEntry(entryData, 100)
    const entries = getAllEntries() as HistoryEntry[]

    expect(entries).toHaveLength(1)
    expect(entries[0].text).toBe('Hello world')
    expect(entries[0].provider).toBe('groq')
    expect(entries[0].id).toMatch(/^[0-9a-f-]{36}$/)
    expect(entries[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('prepends new entries so most recent comes first', () => {
    appendEntry({ ...entryData, text: 'First' }, 100)
    appendEntry({ ...entryData, text: 'Second' }, 100)
    const entries = getAllEntries() as HistoryEntry[]

    expect(entries[0].text).toBe('Second')
    expect(entries[1].text).toBe('First')
  })

  it('trims to the retain limit', () => {
    for (let i = 0; i < 5; i++) {
      appendEntry({ ...entryData, text: `Entry ${i}` }, 3)
    }

    expect(getAllEntries()).toHaveLength(3)
  })
})

describe('deleteEntry', () => {
  it('removes the entry with the given id', () => {
    appendEntry(entryData, 100)
    const id = (getAllEntries() as HistoryEntry[])[0].id

    deleteEntry(id)

    expect(getAllEntries()).toHaveLength(0)
  })

  it('leaves other entries untouched', () => {
    appendEntry({ ...entryData, text: 'Keep' }, 100)
    appendEntry({ ...entryData, text: 'Delete me' }, 100)
    const id = (getAllEntries() as HistoryEntry[])[0].id

    deleteEntry(id)

    const remaining = getAllEntries() as HistoryEntry[]
    expect(remaining).toHaveLength(1)
    expect(remaining[0].text).toBe('Keep')
  })
})

describe('clearAll', () => {
  it('empties the history', () => {
    appendEntry(entryData, 100)
    appendEntry(entryData, 100)

    clearAll()

    expect(getAllEntries()).toHaveLength(0)
  })
})

describe('exportEntries', () => {
  it('returns valid JSON containing all entries', () => {
    appendEntry(entryData, 100)

    const parsed = JSON.parse(exportEntries()) as HistoryEntry[]

    expect(parsed).toHaveLength(1)
    expect(parsed[0].text).toBe('Hello world')
  })

  it('returns an empty array when history is empty', () => {
    expect(JSON.parse(exportEntries())).toEqual([])
  })
})
