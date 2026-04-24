import Store from 'electron-store'
import { randomUUID } from 'crypto'
import { rmSync, existsSync } from 'fs'

export interface HistoryEntry {
  id: string
  text: string
  transcript?: string
  recordingFolder?: string
  timestamp: string
  provider: string
  model: string
}

const store = new Store<{ entries: HistoryEntry[] }>({ name: 'history' })

function getEntries(): HistoryEntry[] {
  return store.get('entries', [])
}

export function appendEntry(
  data: Omit<HistoryEntry, 'id' | 'timestamp'>,
  retain: number
): void {
  const entries = [
    { id: randomUUID(), timestamp: new Date().toISOString(), ...data },
    ...getEntries()
  ].slice(0, retain)
  store.set('entries', entries)
}

export function getAllEntries(): HistoryEntry[] {
  return getEntries()
}

function removeFolder(entry: HistoryEntry): void {
  if (entry.recordingFolder && existsSync(entry.recordingFolder)) {
    rmSync(entry.recordingFolder, { recursive: true, force: true })
  }
}

export function deleteEntry(id: string): void {
  const entries = getEntries()
  const entry = entries.find((e) => e.id === id)
  if (entry) removeFolder(entry)
  store.set('entries', entries.filter((e) => e.id !== id))
}

export function clearAll(): void {
  getEntries().forEach(removeFolder)
  store.set('entries', [])
}

export function exportEntries(): string {
  return JSON.stringify(getEntries(), null, 2)
}
