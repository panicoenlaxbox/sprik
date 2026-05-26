import type { WebContents } from 'electron'
import { CHANNELS } from '../shared/channels'
import { log, setLogRenderer } from './logger'

vi.mock('electron-log/main.js', () => ({
  default: {
    transports: {
      file: { resolvePathFn: null as unknown },
      console: { level: false }
    },
    scope: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }))
  }
}))

afterEach(() => {
  setLogRenderer(null as unknown as WebContents)
})

describe('setLogRenderer', () => {
  it('registers the WebContents target for log forwarding', () => {
    const wc = { isDestroyed: vi.fn(() => false), send: vi.fn() }
    setLogRenderer(wc as unknown as WebContents)
    log('test', 'hello')
    expect(wc.send).toHaveBeenCalledWith(
      CHANNELS.LOG_FORWARD,
      'test',
      'hello',
      'info',
      expect.any(Number)
    )
  })
})

describe('log', () => {
  it('forwards to renderer with correct arguments when target is alive', () => {
    const wc = { isDestroyed: vi.fn(() => false), send: vi.fn() }
    setLogRenderer(wc as unknown as WebContents)
    log('scope', 'message', 'warn')
    expect(wc.send).toHaveBeenCalledWith(
      CHANNELS.LOG_FORWARD,
      'scope',
      'message',
      'warn',
      expect.any(Number)
    )
  })

  it('skips renderer send when target is destroyed', () => {
    const wc = { isDestroyed: vi.fn(() => true), send: vi.fn() }
    setLogRenderer(wc as unknown as WebContents)
    log('scope', 'message')
    expect(wc.send).not.toHaveBeenCalled()
  })
})
