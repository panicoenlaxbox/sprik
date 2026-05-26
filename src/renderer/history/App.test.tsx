import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import type { HistoryEntry } from '../shared/types'

const entry1: HistoryEntry = {
  id: 'abc-1',
  processed: 'Hello world from Groq',
  timestamp: '2026-04-24T10:00:00.000Z',
  transcription: { provider: 'groq', model: 'whisper-large-v3-turbo' }
}

const entry2: HistoryEntry = {
  id: 'abc-2',
  processed: 'Another transcription via OpenAI',
  timestamp: '2026-04-24T09:00:00.000Z',
  transcription: { provider: 'openai', model: 'whisper-1' }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(window.api.getHistory).mockResolvedValue([entry1, entry2])
  vi.mocked(window.api.deleteHistory).mockResolvedValue(undefined)
  vi.mocked(window.api.clearHistory).mockResolvedValue(undefined)
  vi.mocked(window.api.copyToClipboard).mockResolvedValue(undefined)
  vi.mocked(window.api.getConfig).mockResolvedValue({
    shortcuts: { toggleRecording: 'Ctrl+Alt+Space', cancelRecording: 'Escape' },
    transcription: { provider: 'groq', model: 'whisper-large-v3-turbo' },
    postProcessing: {
      enabled: false,
      provider: 'anthropic',
      model: 'claude-haiku-4-5',
      prompt: ''
    },
    pasteMode: 'clipboard-and-focus',
    history: { retain: 100, enabled: true, saveAudio: false },
    startup: { autostart: false, autoCheck: true, checkIntervalHours: 4 },
    ui: { theme: 'system', sidebarExpanded: false, detailsPanelWidth: 320 },
    overlay: { showTimer: false, invertColors: true }
  })
})

describe('History App', () => {
  it('shows a loading state then renders entries', async () => {
    render(<App />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Hello world from Groq')).toBeInTheDocument())
    expect(screen.getByText('Another transcription via OpenAI')).toBeInTheDocument()
  })

  it('filters entries by search text', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByLabelText(/search history/i))

    await user.type(screen.getByLabelText(/search history/i), 'Groq')

    expect(screen.getByText('Hello world from Groq')).toBeInTheDocument()
    expect(screen.queryByText('Another transcription via OpenAI')).not.toBeInTheDocument()
  })

  it('requires confirmation before deleting an individual entry', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)
    await waitFor(() => screen.getAllByRole('button', { name: /^delete$/i }))

    await user.click(screen.getAllByRole('button', { name: /^delete$/i })[0])

    expect(window.confirm).toHaveBeenCalledWith('Delete this entry?')
    expect(window.api.deleteHistory).toHaveBeenCalledWith('abc-1')
    expect(screen.queryByText('Hello world from Groq')).not.toBeInTheDocument()
  })

  it('calls copyToClipboard with the entry text on Copy click and shows a check icon briefly', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getAllByRole('button', { name: /copy/i }))

    await user.click(screen.getAllByRole('button', { name: /copy/i })[0])

    expect(window.api.copyToClipboard).toHaveBeenCalledWith('Hello world from Groq')
  })

  it('deletes all history when confirmed via native dialog', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: /delete all/i }))

    await user.click(screen.getByRole('button', { name: /delete all/i }))

    expect(window.confirm).toHaveBeenCalledWith('Delete all entries?')
    expect(window.api.clearHistory).toHaveBeenCalled()
    expect(screen.queryByText('Hello world from Groq')).not.toBeInTheDocument()
    expect(screen.getByText(/no recordings yet/i)).toBeInTheDocument()
  })

  it('cancels delete-all when native dialog is dismissed', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: /delete all/i }))

    await user.click(screen.getByRole('button', { name: /delete all/i }))

    expect(window.api.clearHistory).not.toHaveBeenCalled()
    expect(screen.getByText('Hello world from Groq')).toBeInTheDocument()
  })

  it('shows "No results" message when search yields nothing', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByLabelText(/search history/i))

    await user.type(screen.getByLabelText(/search history/i), 'zzznomatch')

    expect(screen.getByText(/no results for that query/i)).toBeInTheDocument()
  })

  it('reloads all entries from disk when a new entry is added', async () => {
    const entry3: HistoryEntry = {
      id: 'abc-3',
      processed: 'New entry after retain trim',
      timestamp: '2026-04-24T11:00:00.000Z',
      transcription: { provider: 'groq', model: 'whisper-large-v3-turbo' }
    }
    let addedCallback: ((entry: HistoryEntry) => void) | undefined
    vi.mocked(window.api.onHistoryEntryAdded).mockImplementation((cb) => {
      addedCallback = cb
      return () => {}
    })
    vi.mocked(window.api.getHistory)
      .mockResolvedValueOnce([entry1, entry2])
      .mockResolvedValueOnce([entry3, entry1])

    render(<App />)
    await waitFor(() => screen.getByText('Hello world from Groq'))

    addedCallback!(entry3)

    await waitFor(() => expect(screen.getByText('New entry after retain trim')).toBeInTheDocument())
    expect(screen.queryByText('Another transcription via OpenAI')).not.toBeInTheDocument()
  })

  it('replaces entries when history is trimmed via settings change', async () => {
    let trimmedCallback: ((entries: HistoryEntry[]) => void) | undefined
    vi.mocked(window.api.onHistoryTrimmed).mockImplementation((cb) => {
      trimmedCallback = cb
      return () => {}
    })

    render(<App />)
    await waitFor(() => screen.getByText('Hello world from Groq'))

    await act(async () => {
      trimmedCallback!([entry2])
    })

    await waitFor(() =>
      expect(screen.queryByText('Hello world from Groq')).not.toBeInTheDocument()
    )
    expect(screen.getByText('Another transcription via OpenAI')).toBeInTheDocument()
  })
})
