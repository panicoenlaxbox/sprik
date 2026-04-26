import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import type { Config, ApiKeyStatus } from '../shared/types'

const mockConfig: Config = {
  shortcuts: { toggleRecording: 'Ctrl+Alt+Space', cancelRecording: 'Escape' },
  transcription: { provider: 'groq', model: 'whisper-large-v3-turbo' },
  postProcessing: { enabled: false, provider: 'anthropic', model: 'claude-sonnet-4-6', prompt: '' },
  paste: { autoPaste: true },
  history: { retain: 100, enabled: true },
  autostart: { enabled: false },
  ui: { theme: 'system' },
  recordings: { saveText: false, saveAudio: false }
}

const mockKeyStatus: ApiKeyStatus = { openai: false, groq: true, anthropic: false }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(window.api.getConfig).mockResolvedValue(mockConfig)
  vi.mocked(window.api.getApiKeyStatus).mockResolvedValue(mockKeyStatus)
  vi.mocked(window.api.setConfig).mockResolvedValue({ toggleFailed: false })
  vi.mocked(window.api.getShortcutStatus).mockResolvedValue({ toggleRegistered: true })
  vi.mocked(window.api.getSystemLocale).mockResolvedValue('en')
  vi.mocked(window.api.getApiKey).mockResolvedValue('')
  vi.mocked(window.api.getRecordingsPath).mockResolvedValue(
    'C:\\Users\\user\\AppData\\Roaming\\sprik'
  )
  vi.mocked(window.api.setApiKey).mockResolvedValue(undefined)
  vi.mocked(window.api.clearApiKey).mockResolvedValue(undefined)
})

describe('Settings App', () => {
  it('shows a loading state then renders config', async () => {
    render(<App />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Settings')).toBeInTheDocument())
    expect(screen.getByRole('combobox', { name: /provider/i })).toHaveValue('groq')
  })

  it('pre-loads stored key value into the input field', async () => {
    vi.mocked(window.api.getApiKey).mockImplementation((provider) =>
      Promise.resolve(provider === 'groq' ? 'gsk-stored-key' : '')
    )

    render(<App />)
    await waitFor(() => screen.getByText('Settings'))

    expect(screen.getByLabelText(/groq api key/i)).toHaveValue('gsk-stored-key')
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

  it('clears a stored key when its field is emptied and saved', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByLabelText(/groq api key/i))

    // Groq has isSet=true; user types something then deletes it → pending becomes ''
    const groqInput = screen.getByLabelText(/groq api key/i)
    await user.type(groqInput, 'x')
    await user.clear(groqInput)
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(window.api.clearApiKey).toHaveBeenCalledWith('groq')
  })

  it('toggles the auto-paste checkbox and saves it', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText('Settings'))

    await user.click(screen.getByRole('checkbox', { name: /auto-paste/i }))
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(window.api.setConfig).toHaveBeenCalledWith(
      expect.objectContaining({ paste: { autoPaste: false } })
    )
  })

  it('enables post-processing when toggle is checked and a prompt is provided', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText('Settings'))

    await user.click(screen.getByLabelText(/enable post-processing/i))
    await user.type(screen.getByLabelText(/instructions/i), 'Fix punctuation.')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(window.api.setConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        postProcessing: expect.objectContaining({ enabled: true, prompt: 'Fix punctuation.' })
      })
    )
  })

  it('blocks save when post-processing is enabled but prompt is empty', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText('Settings'))

    await user.click(screen.getByLabelText(/enable post-processing/i))
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(window.api.setConfig).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/prompt is required/i)
  })

  it('toggles autostart and saves it', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText('Settings'))

    await user.click(screen.getByLabelText(/launch sprik at login/i))
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(window.api.setConfig).toHaveBeenCalledWith(
      expect.objectContaining({ autostart: { enabled: true } })
    )
  })

  it('shows retain input and storage options only when history is enabled', async () => {
    const user = userEvent.setup()
    vi.mocked(window.api.getConfig).mockResolvedValue({
      ...mockConfig,
      history: { retain: 100, enabled: false }
    })

    render(<App />)
    await waitFor(() => screen.getByText('Settings'))

    expect(screen.queryByLabelText(/keep last/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/save transcript/i)).not.toBeInTheDocument()

    await user.click(screen.getByLabelText(/enable history/i))

    expect(screen.getByLabelText(/keep last/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/save transcript/i)).toBeInTheDocument()
  })

  it('blocks save and shows error when retain is less than 1', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByText('Settings'))

    fireEvent.change(screen.getByLabelText(/keep last/i), { target: { value: '0' } })
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(window.api.setConfig).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/at least 1/i)
  })

  it('shows LLM provider and model when post-processing is enabled', async () => {
    const configWithPostProcess = {
      ...mockConfig,
      postProcessing: { ...mockConfig.postProcessing, enabled: true }
    }
    vi.mocked(window.api.getConfig).mockResolvedValue(configWithPostProcess)

    render(<App />)
    await waitFor(() => screen.getByText('Settings'))

    expect(screen.getByRole('combobox', { name: /llm provider/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /instructions/i })).toBeInTheDocument()
  })
})
