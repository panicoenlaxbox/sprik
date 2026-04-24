import { app } from 'electron'
import { setAutostart, getAutostart } from './autostart'
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const DESKTOP_DIR = join(homedir(), '.config', 'autostart')
const DESKTOP_FILE = join(DESKTOP_DIR, 'murmur.desktop')

vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn()
}))

const originalPlatform = process.platform

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(existsSync).mockReturnValue(false)
})

afterEach(() => {
  Object.defineProperty(process, 'platform', { value: originalPlatform })
})

describe('setAutostart', () => {
  describe('on linux', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'linux' })
    })

    it('creates autostart dir and .desktop file when enabling', () => {
      setAutostart(true)

      expect(mkdirSync).toHaveBeenCalledWith(DESKTOP_DIR, { recursive: true })
      expect(writeFileSync).toHaveBeenCalledWith(
        DESKTOP_FILE,
        expect.stringContaining('[Desktop Entry]'),
        'utf8'
      )
    })

    it('skips mkdir when autostart dir already exists', () => {
      vi.mocked(existsSync).mockImplementation((p) => p === DESKTOP_DIR)

      setAutostart(true)

      expect(mkdirSync).not.toHaveBeenCalled()
      expect(writeFileSync).toHaveBeenCalled()
    })

    it('removes the .desktop file when disabling', () => {
      vi.mocked(existsSync).mockReturnValue(true)

      setAutostart(false)

      expect(unlinkSync).toHaveBeenCalledWith(DESKTOP_FILE)
    })

    it('does nothing when disabling and file does not exist', () => {
      setAutostart(false)

      expect(unlinkSync).not.toHaveBeenCalled()
    })
  })

  describe('on win32 / darwin', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
    })

    it('calls setLoginItemSettings with openAtLogin true', () => {
      setAutostart(true)

      expect(app.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: true })
    })

    it('calls setLoginItemSettings with openAtLogin false', () => {
      setAutostart(false)

      expect(app.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: false })
    })
  })
})

describe('getAutostart', () => {
  it('returns true on linux when .desktop file exists', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })
    vi.mocked(existsSync).mockReturnValue(true)

    expect(getAutostart()).toBe(true)
  })

  it('returns false on linux when .desktop file does not exist', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' })

    expect(getAutostart()).toBe(false)
  })

  it('reads openAtLogin from app.getLoginItemSettings on win32', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' })
    vi.mocked(app.getLoginItemSettings).mockReturnValue({ openAtLogin: true } as ReturnType<typeof app.getLoginItemSettings>)

    expect(getAutostart()).toBe(true)
  })
})
