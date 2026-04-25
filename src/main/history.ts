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

function removeRecording(entry: HistoryEntry): void {
  if (entry.path && existsSync(entry.path)) {
    rmSync(entry.path, { recursive: true, force: true })
  }
}

export function deleteEntry(id: string): void {
  const entries = getEntries()
  const entry = entries.find((e) => e.id === id)
  if (entry) removeRecording(entry)
  store.set('entries', entries.filter((e) => e.id !== id))
}

export function clearAll(): void {
  getEntries().forEach(removeRecording)
  store.set('entries', [])
}

export function exportEntries(): string {
  return JSON.stringify(getEntries(), null, 2)
}
