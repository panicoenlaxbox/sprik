import electronLog from 'electron-log/main.js'
import { app } from 'electron'
import { join } from 'path'
import { CHANNELS } from '../shared/channels'
import type { WebContents } from 'electron'

electronLog.transports.file.resolvePathFn = () => join(app.getPath('userData'), 'app.log')
electronLog.transports.console.level = false

let target: WebContents | null = null

export function setLogRenderer(wc: WebContents): void {
  target = wc
}

type Level = 'info' | 'warn' | 'error'

export function log(scope: string, message: string, level: Level = 'info'): void {
  electronLog.scope(scope)[level](message)
  console[level](`[${scope}] ${message}`)
  if (target && !target.isDestroyed()) {
    target.send(CHANNELS.LOG_FORWARD, scope, message, level)
  }
}
