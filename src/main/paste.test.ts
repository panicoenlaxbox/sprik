import { clipboard } from 'electron'
import { exec } from 'child_process'
import { copyAndPaste, getPasteCommand } from './paste'

vi.mock('child_process', () => ({
  exec: vi.fn((_cmd: string, cb: (err: Error | null) => void) => cb(null))
}))

const mockExec = vi.mocked(
  exec as unknown as (cmd: string, cb: (err: Error | null) => void) => void
)

afterEach(() => {
  vi.mocked(clipboard.writeText).mockReset()
  mockExec.mockClear()
})

describe('getPasteCommand', () => {
  const originalPlatform = process.platform
  const originalXdg = process.env['XDG_SESSION_TYPE']

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform })
    process.env['XDG_SESSION_TYPE'] = originalXdg
  })

  it('returns a PowerShell SendKeys command on Windows', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' })
    expect(getPasteCommand()).toContain('SendKeys')
    expect(getPasteCommand()).toContain('powershell')
  })

  it('returns an osascript command on macOS', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' })
    expect(getPasteCommand()).toContain('osascript')
    expect(getPasteCommand()).toContain('keystroke')
  })

  it('returns xdotool on Linux X11', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })
    process.env['XDG_SESSION_TYPE'] = 'x11'
    expect(getPasteCommand()).toBe('xdotool key ctrl+v')
  })

  it('returns ydotool on Linux Wayland', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })
    process.env['XDG_SESSION_TYPE'] = 'wayland'
    expect(getPasteCommand()).toBe('ydotool key ctrl+v')
  })
})

describe('copyAndPaste', () => {
  it('clipboard-and-focus: writes to clipboard and executes native paste', async () => {
    await copyAndPaste('hello world', 'clipboard-and-focus')

    expect(clipboard.writeText).toHaveBeenCalledWith('hello world')
    expect(mockExec).toHaveBeenCalledOnce()
  })

  it('clipboard-only: writes to clipboard without native paste', async () => {
    await copyAndPaste('hello world', 'clipboard-only')

    expect(clipboard.writeText).toHaveBeenCalledWith('hello world')
    expect(mockExec).not.toHaveBeenCalled()
  })

  it('focus-only: pastes text and restores previous clipboard content', async () => {
    vi.mocked(clipboard.readText).mockReturnValue('previous content')

    await copyAndPaste('hello world', 'focus-only')

    expect(clipboard.writeText).toHaveBeenNthCalledWith(1, 'hello world')
    expect(mockExec).toHaveBeenCalledOnce()
    expect(clipboard.writeText).toHaveBeenNthCalledWith(2, 'previous content')
  })

  it('defaults to clipboard-and-focus when no mode is given', async () => {
    await copyAndPaste('hello world')

    expect(clipboard.writeText).toHaveBeenCalledWith('hello world')
    expect(mockExec).toHaveBeenCalledOnce()
  })

  it('does not throw when native paste command fails', async () => {
    mockExec.mockImplementationOnce((_, cb) => cb(new Error('xdotool not found')))

    await expect(copyAndPaste('hello world')).resolves.toBeUndefined()
    expect(clipboard.writeText).toHaveBeenCalledWith('hello world')
  })
})
