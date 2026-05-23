import { vi } from 'vitest'
import { tmpdir } from 'os'

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => (name === 'temp' ? tmpdir() : `/tmp/sprik-test/${name}`)),
    getVersion: vi.fn(() => '0.1.0'),
    getName: vi.fn(() => 'Sprik'),
    quit: vi.fn(),
    isReady: vi.fn(() => true),
    setLoginItemSettings: vi.fn(),
    getLoginItemSettings: vi.fn(() => ({ openAtLogin: false }))
  },
  clipboard: {
    writeText: vi.fn(),
    readText: vi.fn(() => ''),
    writeImage: vi.fn(),
    readImage: vi.fn(() => ({ isEmpty: () => true })),
    availableFormats: vi.fn(() => [] as string[])
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((text: string) => Buffer.from(text, 'utf-8')),
    decryptString: vi.fn((buf: Buffer) => buf.toString('utf-8'))
  },
  globalShortcut: {
    register: vi.fn(() => true),
    unregister: vi.fn(),
    unregisterAll: vi.fn(),
    isRegistered: vi.fn(() => false)
  },
  ipcMain: {
    on: vi.fn(),
    handle: vi.fn(),
    removeAllListeners: vi.fn()
  },
  BrowserWindow: vi.fn(),
  Tray: vi.fn(),
  Menu: {
    buildFromTemplate: vi.fn(),
    setApplicationMenu: vi.fn()
  },
  nativeImage: {
    createFromPath: vi.fn(() => ({})),
    createEmpty: vi.fn(() => ({}))
  },
  Notification: vi.fn().mockImplementation(() => ({
    show: vi.fn()
  })),
  shell: {
    openExternal: vi.fn()
  }
}))
