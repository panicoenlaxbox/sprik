import Store from 'electron-store'
import { randomUUID } from 'crypto'
import { rmSync, existsSync } from 'fs'

export interface ModelRef {
  provider: string
  model: string
}

export interface HistoryEntry {
  id: string
  processed: string
  transcript?: string
  path?: string
  timestamp: string
  transcription: ModelRef
  postProcessing?: ModelRef
  language?: string
  microphone?: string
}

const store = new Store<{ entries: HistoryEntry[] }>({ name: 'history' })

export function getEntries(): HistoryEntry[] {
  return store.get('entries', [])
}

export function appendEntry(data: Omit<HistoryEntry, 'id' | 'timestamp'>, retain: number): void {
  const all = [{ id: randomUUID(), timestamp: new Date().toISOString(), ...data }, ...getEntries()]
  all.slice(retain).forEach(removeEntryFiles)
  store.set('entries', all.slice(0, retain))
}

function removeEntryFiles(entry: HistoryEntry): void {
  if (entry.path && existsSync(entry.path)) {
    rmSync(entry.path, { recursive: true, force: true })
  }
}

export function deleteEntry(id: string): void {
  const entries = getEntries()
  const entry = entries.find((e) => e.id === id)
  if (entry) removeEntryFiles(entry)
  store.set(
    'entries',
    entries.filter((e) => e.id !== id)
  )
}

export function clearEntries(): void {
  getEntries().forEach(removeEntryFiles)
  store.set('entries', [])
}

export function exportEntries(): string {
  return JSON.stringify(getEntries(), null, 2)
}
