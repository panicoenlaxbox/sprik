import { globalShortcut } from 'electron'
import { log } from './logger'

export interface ShortcutConfig {
  toggleRecording: string
  cancelRecording: string
}

export interface ShortcutHandlers {
  onToggle: () => void
  onCancel: () => void
}

export type ShortcutCollisionReporter = (accelerator: string) => void

const defaultCollision: ShortcutCollisionReporter = (a) =>
  log('shortcuts', `${a} is taken by another app`, 'warn')

function isValidAccelerator(acc: string): boolean {
  return acc.split('').every((c) => c.charCodeAt(0) <= 127)
}

export function registerShortcuts(
  config: ShortcutConfig,
  handlers: ShortcutHandlers,
  onCollision: ShortcutCollisionReporter = defaultCollision
): { toggleFailed: boolean } {
  globalShortcut.unregister(config.toggleRecording)
  if (!isValidAccelerator(config.toggleRecording)) {
    onCollision(config.toggleRecording)
    return { toggleFailed: true }
  }
  let toggleOk: boolean
  try {
    toggleOk = globalShortcut.register(config.toggleRecording, handlers.onToggle)
  } catch {
    toggleOk = false
  }
  if (!toggleOk) onCollision(config.toggleRecording)
  return { toggleFailed: !toggleOk }
}

export function isShortcutRegistered(accelerator: string): boolean {
  return globalShortcut.isRegistered(accelerator)
}

export function registerCancelShortcut(
  accelerator: string,
  handler: () => void,
  onCollision: ShortcutCollisionReporter = defaultCollision
): void {
  globalShortcut.unregister(accelerator)
  let registered: boolean
  try {
    registered = isValidAccelerator(accelerator) && globalShortcut.register(accelerator, handler)
  } catch {
    registered = false
  }
  if (!registered) onCollision(accelerator)
}

export function unregisterCancelShortcut(accelerator: string): void {
  globalShortcut.unregister(accelerator)
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll()
}
