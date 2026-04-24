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

const defaultCollision: ShortcutCollisionReporter = (a) =>
  console.error(`[shortcuts] ${a} is taken by another app`)

export function registerShortcuts(
  config: ShortcutConfig,
  handlers: ShortcutHandlers,
  onCollision: ShortcutCollisionReporter = defaultCollision
): void {
  globalShortcut.unregister(config.toggleRecording)
  if (!globalShortcut.register(config.toggleRecording, handlers.onToggle)) {
    onCollision(config.toggleRecording)
  }
}

export function registerCancelShortcut(
  accelerator: string,
  handler: () => void,
  onCollision: ShortcutCollisionReporter = defaultCollision
): void {
  globalShortcut.unregister(accelerator)
  if (!globalShortcut.register(accelerator, handler)) {
    onCollision(accelerator)
  }
}

export function unregisterCancelShortcut(accelerator: string): void {
  globalShortcut.unregister(accelerator)
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll()
}
