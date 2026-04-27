import Store from 'electron-store'
import { randomUUID } from 'crypto'
import { rmSync, existsSync } from 'fs'
import type { HistoryEntry } from '../renderer/shared/types'

export type { HistoryEntry } from '../renderer/shared/types'

const store = new Store<{ entries: HistoryEntry[] }>({ name: 'history' })

export function getEntries(): HistoryEntry[] {
  return store.get('entries', [])
}

export function appendEntry(
  data: Omit<HistoryEntry, 'id' | 'timestamp'>,
  retain: number
): HistoryEntry {
  const entry: HistoryEntry = { id: randomUUID(), timestamp: new Date().toISOString(), ...data }
  const all = [entry, ...getEntries()]
  all.slice(retain).forEach(removeEntryFiles)
  store.set('entries', all.slice(0, retain))
  return entry
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
