import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import type { Config, ApiKeyStatus } from '../shared/types'

const mockConfig: Config = {
  shortcuts: { toggleRecording: 'Ctrl+Alt+Space', cancelRecording: 'Escape' },
  transcription: { provider: 'groq', model: 'whisper-large-v3-turbo' },
  postProcess: { enabled: false, provider: 'anthropic', model: 'claude-sonnet-4-6', systemPrompt: '' },
  paste: { autoPaste: true },
  history: { retain: 100, enabled: true },
  autostart: { enabled: false },
  ui: { theme: 'system' }
}

const mockKeyStatus: ApiKeyStatus = { openai: false, groq: true, anthropic: false }

beforeEach(() => {
  vi.mocked(window.api.getConfig).mockResolvedValue(mockConfig)
  vi.mocked(window.api.getApiKeyStatus).mockResolvedValue(mockKeyStatus)
  vi.mocked(window.api.setConfig).mockResolvedValue(undefined)
  vi.mocked(window.api.setApiKey).mockResolvedValue(undefined)
  vi.mocked(window.api.clearApiKey).mockResolvedValue(undefined)
})

describe('Settings App', () => {
  it('shows a loading state then renders config', async () => {
    render(<App />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Murmur Settings')).toBeInTheDocument())
    expect(screen.getByRole('combobox', { name: /provider/i })).toHaveValue('groq')
  })

  it('shows "Key saved" for providers that have a stored key', async () => {
    render(<App />)
    await waitFor(() => screen.getByText('Murmur Settings'))
    expect(screen.getByLabelText(/groq key is set/i)).toBeInTheDocument()
  })

  it('calls setConfig with updated provider when saving', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByRole('combobox', { name: /provider/i }))

    await user.selectOptions(screen.getByRole('combobox', { name: /provider/i }), 'openai')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(window.api.setConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        transcription: expect.objectContaining({ provider: 'openai' })
      })
    )
  })

  it('saves a pending API key on Save', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByLabelText(/openai api key/i))

    await user.type(screen.getByLabelText(/openai api key/i), 'sk-new-key')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(window.api.setApiKey).toHaveBeenCalledWith('openai', 'sk-new-key')
  })

  it('toggles the auto-paste checkbox and saves it', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByRole('checkbox'))

    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(window.api.setConfig).toHaveBeenCalledWith(
      expect.objectContaining({ paste: { autoPaste: false } })
    )
  })
})
