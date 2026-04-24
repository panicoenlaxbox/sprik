import { globalShortcut } from 'electron'
import { registerShortcuts, unregisterShortcuts } from './shortcuts'

const defaultConfig = { toggleRecording: 'Ctrl+Alt+Space', cancelRecording: 'Escape' }
const noop = (): void => {}
const defaultHandlers = { onToggle: noop, onCancel: noop }

describe('registerShortcuts', () => {
  beforeEach(() => {
    vi.mocked(globalShortcut.register).mockReturnValue(true)
    vi.mocked(globalShortcut.unregisterAll).mockReset()
  })

  it('registers the toggle and cancel shortcuts from config', () => {
    registerShortcuts(defaultConfig, defaultHandlers)

    expect(globalShortcut.register).toHaveBeenCalledWith('Ctrl+Alt+Space', defaultHandlers.onToggle)
    expect(globalShortcut.register).toHaveBeenCalledWith('Escape', defaultHandlers.onCancel)
  })

  it('calls onCollision when the toggle shortcut is already taken', () => {
    vi.mocked(globalShortcut.register).mockReturnValueOnce(false).mockReturnValue(true)
    const onCollision = vi.fn()

    registerShortcuts(defaultConfig, defaultHandlers, onCollision)

    expect(onCollision).toHaveBeenCalledWith('Ctrl+Alt+Space')
  })

  it('calls onCollision when the cancel shortcut is already taken', () => {
    vi.mocked(globalShortcut.register).mockReturnValueOnce(true).mockReturnValueOnce(false)
    const onCollision = vi.fn()

    registerShortcuts(defaultConfig, defaultHandlers, onCollision)

    expect(onCollision).toHaveBeenCalledWith('Escape')
  })
})

describe('unregisterShortcuts', () => {
  it('unregisters all shortcuts', () => {
    unregisterShortcuts()
    expect(globalShortcut.unregisterAll).toHaveBeenCalledOnce()
  })
})
