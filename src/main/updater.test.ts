import { app, Notification } from 'electron'
import type { BrowserWindow } from 'electron'
import { CHANNELS } from '../shared/channels'
import { initUpdater, getAndClearPendingNavigation } from './updater'

const mockAutoUpdater = vi.hoisted(() => ({
  autoDownload: false as boolean,
  autoInstallOnAppQuit: false as boolean,
  logger: null as null,
  forceDevUpdateConfig: false as boolean,
  on: vi.fn(),
  checkForUpdates: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('electron-updater', () => ({
  default: { autoUpdater: mockAutoUpdater }
}))

let storeData: Record<string, unknown> = {}
vi.mock('electron-store', () => ({
  default: vi.fn().mockImplementation(() => ({
    get store() {
      return storeData
    },
    set store(v: Record<string, unknown>) {
      storeData = v
    }
  }))
}))

function getHandler(eventName: string): (...args: unknown[]) => unknown {
  const calls = mockAutoUpdater.on.mock.calls as [string, (...args: unknown[]) => void][]
  const call = calls.find(([e]) => e === eventName)
  if (!call) throw new Error(`No handler registered for event '${eventName}'`)
  return call[1]
}

function makeWindow(destroyed = false, loading = false): BrowserWindow {
  return {
    isDestroyed: vi.fn(() => destroyed),
    webContents: { send: vi.fn(), isLoading: vi.fn(() => loading) }
  } as unknown as BrowserWindow
}

function setupWin32(
  getWindow: () => BrowserWindow | null = () => makeWindow(),
  options: {
    storeData?: Record<string, unknown>
    isPackaged?: boolean
    openWindow?: () => BrowserWindow
  } = {}
): void {
  Object.defineProperty(process, 'platform', { value: 'win32', configurable: true })
  Object.defineProperty(app, 'isPackaged', {
    value: options.isPackaged ?? false,
    configurable: true,
    writable: true
  })
  storeData = options.storeData ?? {}
  vi.mocked(mockAutoUpdater.on).mockClear()
  vi.mocked(mockAutoUpdater.checkForUpdates).mockClear()
  initUpdater(getWindow, options.openWindow ?? (() => makeWindow()))
}

const originalPlatform = process.platform

afterEach(() => {
  Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
  storeData = {}
  vi.mocked(mockAutoUpdater.on).mockClear()
  vi.mocked(mockAutoUpdater.checkForUpdates).mockClear()
})

describe('initUpdater', () => {
  it('returns immediately on non-win32 platforms', () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true })
    vi.mocked(mockAutoUpdater.on).mockClear()
    initUpdater(
      () => null,
      () => makeWindow()
    )
    expect(mockAutoUpdater.on).not.toHaveBeenCalled()
  })

  it('sets autoDownload, autoInstallOnAppQuit and forceDevUpdateConfig on win32', () => {
    setupWin32()
    expect(mockAutoUpdater.autoDownload).toBe(true)
    expect(mockAutoUpdater.autoInstallOnAppQuit).toBe(true)
    expect(mockAutoUpdater.forceDevUpdateConfig).toBe(true)
  })

  it('skips forceDevUpdateConfig when app is packaged', () => {
    mockAutoUpdater.forceDevUpdateConfig = false
    setupWin32(() => null, { isPackaged: true })
    expect(mockAutoUpdater.forceDevUpdateConfig).toBe(false)
  })

  it('registers all expected event handlers', () => {
    setupWin32()
    const events = vi.mocked(mockAutoUpdater.on).mock.calls.map(([e]) => e)
    expect(events).toContain('checking-for-update')
    expect(events).toContain('update-available')
    expect(events).toContain('update-not-available')
    expect(events).toContain('download-progress')
    expect(events).toContain('update-downloaded')
    expect(events).toContain('error')
  })

  it('calls checkForUpdates immediately when autoCheck is true', () => {
    setupWin32()
    expect(mockAutoUpdater.checkForUpdates).toHaveBeenCalledOnce()
  })

  it('logs current version before checking', () => {
    setupWin32()
    expect(vi.mocked(app.getVersion)()).toBe('0.1.0')
  })

  it('does not call checkForUpdates when autoCheck is false', () => {
    setupWin32(() => null, { storeData: { startup: { autoCheck: false } } })
    expect(mockAutoUpdater.checkForUpdates).not.toHaveBeenCalled()
  })

  describe('event handlers: send branches', () => {
    it('checking-for-update: sends checking phase to live window', () => {
      const win = makeWindow(false)
      setupWin32(() => win)
      getHandler('checking-for-update')()
      expect(vi.mocked(win.webContents.send)).toHaveBeenCalledWith(CHANNELS.UPDATE_STATUS, {
        phase: 'checking'
      })
    })

    it('checking-for-update: does not send when window is null', () => {
      setupWin32(() => null)
      expect(() => getHandler('checking-for-update')()).not.toThrow()
    })

    it('checking-for-update: does not send when window is destroyed', () => {
      const win = makeWindow(true)
      setupWin32(() => win)
      getHandler('checking-for-update')()
      expect(vi.mocked(win.webContents.send)).not.toHaveBeenCalled()
    })

    it('update-available: sends available phase with version', () => {
      const win = makeWindow(false)
      setupWin32(() => win)
      getHandler('update-available')({ version: '1.2.3' })
      expect(vi.mocked(win.webContents.send)).toHaveBeenCalledWith(CHANNELS.UPDATE_STATUS, {
        phase: 'available',
        version: '1.2.3'
      })
    })

    it('update-not-available: sends up-to-date phase', () => {
      const win = makeWindow(false)
      setupWin32(() => win)
      getHandler('update-not-available')({ version: '1.0.0' })
      expect(vi.mocked(win.webContents.send)).toHaveBeenCalledWith(CHANNELS.UPDATE_STATUS, {
        phase: 'up-to-date'
      })
    })

    it('download-progress: sends downloading phase and logs on new decile', () => {
      const win = makeWindow(false)
      setupWin32(() => win)
      getHandler('update-available')({ version: '2.0.0' })
      vi.mocked(win.webContents.send).mockClear()

      getHandler('download-progress')({ percent: 5 })
      expect(vi.mocked(win.webContents.send)).toHaveBeenCalledWith(
        CHANNELS.UPDATE_STATUS,
        expect.objectContaining({ phase: 'downloading', percent: 5 })
      )
    })

    it('download-progress: sends downloading phase without extra log on same decile', () => {
      const win = makeWindow(false)
      setupWin32(() => win)
      getHandler('download-progress')({ percent: 3 })
      vi.mocked(win.webContents.send).mockClear()
      getHandler('download-progress')({ percent: 7 })
      expect(vi.mocked(win.webContents.send)).toHaveBeenCalledWith(
        CHANNELS.UPDATE_STATUS,
        expect.objectContaining({ phase: 'downloading', percent: 7 })
      )
    })

    it('update-downloaded: sends ready phase with version', () => {
      const win = makeWindow(false)
      setupWin32(() => win)
      getHandler('update-downloaded')({ version: '2.0.0' })
      expect(vi.mocked(win.webContents.send)).toHaveBeenCalledWith(CHANNELS.UPDATE_STATUS, {
        phase: 'ready',
        version: '2.0.0'
      })
    })

    it('update-downloaded: shows a native OS notification', () => {
      vi.mocked(Notification).mockClear()
      setupWin32(() => makeWindow(false))
      getHandler('update-downloaded')({ version: '2.0.0' })
      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Sprik update ready' })
      )
      const instance = vi.mocked(Notification).mock.results[0].value as {
        show: ReturnType<typeof vi.fn>
        on: ReturnType<typeof vi.fn>
      }
      expect(instance.show).toHaveBeenCalled()
    })

    it('notification click: sends NAVIGATE to loaded window and clears pendingNavigation', () => {
      const win = makeWindow(false, false)
      const openWindow = vi.fn(() => win)
      setupWin32(() => win, { openWindow })
      getHandler('update-downloaded')({ version: '2.0.0' })

      const instance = vi.mocked(Notification).mock.results[
        vi.mocked(Notification).mock.results.length - 1
      ].value as { on: ReturnType<typeof vi.fn> }
      const clickHandler = instance.on.mock.calls.find(([e]) => e === 'click')?.[1] as () => void
      clickHandler()

      expect(openWindow).toHaveBeenCalled()
      expect(vi.mocked(win.webContents.send)).toHaveBeenCalledWith(CHANNELS.NAVIGATE, 'about')
      expect(getAndClearPendingNavigation()).toBeNull()
    })

    it('notification click: sets pendingNavigation when window is loading', () => {
      const win = makeWindow(false, true)
      const openWindow = vi.fn(() => win)
      setupWin32(() => win, { openWindow })
      getHandler('update-downloaded')({ version: '2.0.0' })

      const instance = vi.mocked(Notification).mock.results[
        vi.mocked(Notification).mock.results.length - 1
      ].value as { on: ReturnType<typeof vi.fn> }
      const clickHandler = instance.on.mock.calls.find(([e]) => e === 'click')?.[1] as () => void
      clickHandler()

      expect(vi.mocked(win.webContents.send)).not.toHaveBeenCalledWith(CHANNELS.NAVIGATE, 'about')
      expect(getAndClearPendingNavigation()).toBe('about')
    })

    it('error: sends error phase with message', () => {
      const win = makeWindow(false)
      setupWin32(() => win)
      getHandler('error')(new Error('network failure'))
      expect(vi.mocked(win.webContents.send)).toHaveBeenCalledWith(CHANNELS.UPDATE_STATUS, {
        phase: 'error',
        message: 'network failure'
      })
    })
  })

  describe('setInterval periodic check', () => {
    it('calls checkForUpdates on interval tick when autoCheck is true', () => {
      vi.useFakeTimers()
      setupWin32()
      vi.mocked(mockAutoUpdater.checkForUpdates).mockClear()

      vi.advanceTimersByTime(4 * 60 * 60 * 1000)
      expect(mockAutoUpdater.checkForUpdates).toHaveBeenCalledOnce()
      vi.useRealTimers()
    })

    it('does not call checkForUpdates on interval tick when autoCheck is false', () => {
      vi.useFakeTimers()
      setupWin32(() => null, { storeData: { startup: { autoCheck: false } } })
      vi.mocked(mockAutoUpdater.checkForUpdates).mockClear()

      vi.advanceTimersByTime(4 * 60 * 60 * 1000)
      expect(mockAutoUpdater.checkForUpdates).not.toHaveBeenCalled()
      vi.useRealTimers()
    })
  })
})
