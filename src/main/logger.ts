import electronLog from 'electron-log/main.js'
import { CHANNELS } from './channels'
import type { WebContents } from 'electron'

let target: WebContents | null = null

export function setLogRenderer(wc: WebContents): void {
  target = wc
}

export function log(scope: string, message: string): void {
  electronLog.scope(scope).info(message)
  if (target && !target.isDestroyed()) {
    target.send(CHANNELS.LOG_FORWARD, scope, message)
  }
}
