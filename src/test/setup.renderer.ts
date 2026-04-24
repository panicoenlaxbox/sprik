import '@testing-library/jest-dom/vitest'

// Minimal preload API bridge for renderer tests
Object.defineProperty(window, 'api', {
  value: {
    onOverlayState: vi.fn(() => () => {}),
    getConfig: vi.fn(),
    setConfig: vi.fn(),
    getApiKeyStatus: vi.fn(),
    setApiKey: vi.fn(),
    clearApiKey: vi.fn(),
    getHistory: vi.fn(),
    deleteHistory: vi.fn(),
    copyToClipboard: vi.fn()
  },
  writable: true
})
