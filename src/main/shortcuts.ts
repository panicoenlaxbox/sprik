import { globalShortcut } from 'electron'

export interface ShortcutConfig {
  toggleRecording: string
  cancelRecording: string
}

export interface ShortcutHandlers {
  onToggle: () => void
  onCancel: () => void
}

export type ShortcutCollisionReporter = (accelerator: string) => void

function isValidAccelerator(acc: string): boolean {
  return acc.length > 0 && acc.split('').every((c) => c.charCodeAt(0) <= 127)
}

export function registerShortcuts(
  config: ShortcutConfig,
  handlers: ShortcutHandlers,
  onCollision: ShortcutCollisionReporter = () => {}
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
  onCollision: ShortcutCollisionReporter = () => {}
): void {
  // No cancel shortcut configured: nothing to register, and nothing to report -
  // this is the default, not a failure.
  if (!accelerator) return
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
  if (!accelerator) return
  globalShortcut.unregister(accelerator)
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll()
}
