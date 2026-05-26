import electronLog from 'electron-log/main.js'
import { app } from 'electron'
import { join } from 'path'
import { readFileSync } from 'fs'
import { CHANNELS } from '../shared/channels'
import type { WebContents } from 'electron'

electronLog.transports.file.resolvePathFn = () => join(app.getPath('userData'), 'app.log')
electronLog.transports.console.level = false

let target: WebContents | null = null

export function setLogRenderer(wc: WebContents): void {
  target = wc
}

type Level = 'info' | 'warn' | 'error'

interface LogEntry {
  scope: string
  message: string
  level: Level
  ts: number
}

const MAX_BUFFER = 1000
const buffer: LogEntry[] = []

export function getLogBuffer(): LogEntry[] {
  return [...buffer]
}

// electron-log format: [YYYY-MM-DD HH:mm:ss.sss] [level]  (scope) message
const LINE_RE =
  /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})\] \[(info|warn|error)\]\s+\(([^)]+)\)\s+(.+)$/

export function readLogFile(): LogEntry[] {
  const filePath = join(app.getPath('userData'), 'app.log')
  try {
    const text = readFileSync(filePath, 'utf-8')
    const entries: LogEntry[] = []
    for (const line of text.split('\n')) {
      const m = LINE_RE.exec(line.trim())
      if (!m) continue
      entries.push({
        ts: new Date(m[1]).getTime(),
        level: m[2] as Level,
        scope: m[3].trim(),
        message: m[4].trim()
      })
    }
    return entries
  } catch {
    return []
  }
}

export function log(scope: string, message: string, level: Level = 'info'): void {
  const ts = Date.now()
  buffer.push({ scope, message, level, ts })
  if (buffer.length > MAX_BUFFER) buffer.shift()
  electronLog.scope(scope)[level](message)
  console[level](`[${scope}] ${message}`)
  if (target && !target.isDestroyed()) {
    target.send(CHANNELS.LOG_FORWARD, scope, message, level, ts)
  }
}
