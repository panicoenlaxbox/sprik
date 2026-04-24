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

export function registerShortcuts(
  config: ShortcutConfig,
  handlers: ShortcutHandlers,
  onCollision: ShortcutCollisionReporter = (a) => console.error(`[shortcuts] ${a} is taken by another app`)
): void {
  if (!globalShortcut.register(config.toggleRecording, handlers.onToggle)) {
    onCollision(config.toggleRecording)
  }
  if (!globalShortcut.register(config.cancelRecording, handlers.onCancel)) {
    onCollision(config.cancelRecording)
  }
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll()
}
