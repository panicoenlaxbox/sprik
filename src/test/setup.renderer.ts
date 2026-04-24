import '@testing-library/jest-dom/vitest'

// Minimal preload API bridge for renderer tests
Object.defineProperty(window, 'api', {
  value: {
    getConfig: vi.fn(),
    setConfig: vi.fn(),
    getHistory: vi.fn(),
    deleteHistory: vi.fn(),
    copyToClipboard: vi.fn(),
    onRecordingState: vi.fn(() => () => {}),
    getApiKeyStatus: vi.fn()
  },
  writable: true
})
