import { globalShortcut } from 'electron'
import {
  registerShortcuts,
  registerCancelShortcut,
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
