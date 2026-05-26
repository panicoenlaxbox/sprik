import '@testing-library/jest-dom/vitest'

Object.defineProperty(navigator, 'mediaDevices', {
  value: { enumerateDevices: vi.fn().mockResolvedValue([]) },
  writable: true
})

// Minimal preload API bridge for renderer tests
Object.defineProperty(window, 'api', {
  value: {
    onOverlayState: vi.fn(() => () => {}),
    onLog: vi.fn(() => () => {}),
    getConfig: vi.fn(),
    setConfig: vi.fn(),
    getApiKeyStatus: vi.fn(),
    getApiKey: vi.fn(),
    setApiKey: vi.fn(),
    clearApiKey: vi.fn(),
    getHistory: vi.fn(),
    deleteHistory: vi.fn(),
    clearHistory: vi.fn(),
    exportHistory: vi.fn(),
    copyToClipboard: vi.fn(),
    pauseShortcuts: vi.fn(),
    resumeShortcuts: vi.fn(),
    getShortcutStatus: vi.fn(),
    getSystemLocale: vi.fn(),
    openPath: vi.fn(),
    openRecordingsPath: vi.fn(),
    getRecordingsPath: vi.fn(),
    onThemeChange: vi.fn(() => () => {}),
    onHistoryEntryAdded: vi.fn(() => () => {}),
    onHistoryTrimmed: vi.fn(() => () => {}),
    cancelRecording: vi.fn(),
    getAppVersion: vi.fn().mockResolvedValue('0.1.0'),
    isAutoUpdateSupported: vi.fn().mockReturnValue(false),
    onUpdateStatus: vi.fn(() => () => {}),
    checkForUpdates: vi.fn(),
    installUpdate: vi.fn(),
    openExternalUrl: vi.fn(),
    onOverlayPositionChanged: vi.fn(() => () => {}),
    onOverlaySettingsChange: vi.fn(() => () => {}),
    previewOverlay: vi.fn()
  },
  writable: true
})
