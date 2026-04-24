import Store from 'electron-store'
import { randomUUID } from 'crypto'

export interface HistoryEntry {
  id: string
  text: string
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

export function deleteEntry(id: string): void {
  store.set('entries', getEntries().filter((e) => e.id !== id))
}

export function clearAll(): void {
  store.set('entries', [])
}

export function exportEntries(): string {
  return JSON.stringify(getEntries(), null, 2)
}
