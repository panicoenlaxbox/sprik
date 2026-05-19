import { globalShortcut } from 'electron'
import {
  registerShortcuts,
  registerCancelShortcut,
  isShortcutRegistered,
  unregisterCancelShortcut,
  unregisterShortcuts
} from './shortcuts'

const defaultConfig = { toggleRecording: 'Ctrl+Alt+Space', cancelRecording: 'Escape' }
const noop = (): void => {}
const defaultHandlers = { onToggle: noop, onCancel: noop }

describe('registerShortcuts', () => {
  beforeEach(() => {
    vi.mocked(globalShortcut.register).mockReturnValue(true)
    vi.mocked(globalShortcut.unregisterAll).mockReset()
  })

  it('registers only the toggle shortcut from config', () => {
    registerShortcuts(defaultConfig, defaultHandlers)

    expect(globalShortcut.register).toHaveBeenCalledWith('Ctrl+Alt+Space', defaultHandlers.onToggle)
    expect(globalShortcut.register).toHaveBeenCalledTimes(1)
  })

  it('calls onCollision when the toggle shortcut is already taken', () => {
    vi.mocked(globalShortcut.register).mockReturnValueOnce(false)
    const onCollision = vi.fn()

    registerShortcuts(defaultConfig, defaultHandlers, onCollision)

    expect(onCollision).toHaveBeenCalledWith('Ctrl+Alt+Space')
  })

  it('calls onCollision and returns toggleFailed when accelerator contains non-ASCII characters', () => {
    vi.mocked(globalShortcut.register).mockClear()
    const onCollision = vi.fn()
    const result = registerShortcuts(
      { toggleRecording: 'Ctrl+á', cancelRecording: 'Escape' },
      defaultHandlers,
      onCollision
    )
    expect(onCollision).toHaveBeenCalledWith('Ctrl+á')
    expect(result.toggleFailed).toBe(true)
    expect(globalShortcut.register).not.toHaveBeenCalled()
  })

  it('returns toggleFailed when globalShortcut.register throws', () => {
    vi.mocked(globalShortcut.register).mockImplementationOnce(() => {
      throw new Error('blocked by OS')
    })
    const onCollision = vi.fn()
    const result = registerShortcuts(defaultConfig, defaultHandlers, onCollision)
    expect(result.toggleFailed).toBe(true)
    expect(onCollision).toHaveBeenCalledWith('Ctrl+Alt+Space')
  })

  it('uses the default no-op onCollision when not provided and registration fails', () => {
    vi.mocked(globalShortcut.register).mockReturnValueOnce(false)
    expect(() => registerShortcuts(defaultConfig, defaultHandlers)).not.toThrow()
  })
})

describe('registerCancelShortcut', () => {
  beforeEach(() => {
    vi.mocked(globalShortcut.register).mockReturnValue(true)
  })

  it('registers the cancel shortcut', () => {
    registerCancelShortcut('Escape', noop)

    expect(globalShortcut.register).toHaveBeenCalledWith('Escape', noop)
  })

  it('calls onCollision when the cancel shortcut is already taken', () => {
    vi.mocked(globalShortcut.register).mockReturnValueOnce(false)
    const onCollision = vi.fn()

    registerCancelShortcut('Escape', noop, onCollision)

    expect(onCollision).toHaveBeenCalledWith('Escape')
  })

  it('calls onCollision when globalShortcut.register throws', () => {
    vi.mocked(globalShortcut.register).mockImplementationOnce(() => {
      throw new Error('blocked by OS')
    })
    const onCollision = vi.fn()
    registerCancelShortcut('Escape', noop, onCollision)
    expect(onCollision).toHaveBeenCalledWith('Escape')
  })

  it('uses the default no-op onCollision when not provided and registration fails', () => {
    vi.mocked(globalShortcut.register).mockReturnValueOnce(false)
    expect(() => registerCancelShortcut('Escape', noop)).not.toThrow()
  })
})

describe('isShortcutRegistered', () => {
  it('delegates to globalShortcut.isRegistered', () => {
    vi.mocked(globalShortcut.isRegistered).mockReturnValueOnce(true)
    expect(isShortcutRegistered('Ctrl+Alt+Space')).toBe(true)
    expect(globalShortcut.isRegistered).toHaveBeenCalledWith('Ctrl+Alt+Space')
  })
})

describe('unregisterCancelShortcut', () => {
  it('unregisters the given accelerator', () => {
    vi.mocked(globalShortcut.unregister).mockReset()
    unregisterCancelShortcut('Escape')
    expect(globalShortcut.unregister).toHaveBeenCalledWith('Escape')
  })
})

describe('unregisterShortcuts', () => {
  it('unregisters all shortcuts', () => {
    unregisterShortcuts()
    expect(globalShortcut.unregisterAll).toHaveBeenCalledOnce()
  })
})
