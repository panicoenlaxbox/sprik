import { render, screen, waitFor } from '@testing-library/react'
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
})

describe('History App', () => {
  it('shows a loading state then renders entries', async () => {
    render(<App />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
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
    render(<App />)
    await waitFor(() => screen.getAllByRole('button', { name: /^delete$/i }))

    await user.click(screen.getAllByRole('button', { name: /^delete$/i })[0])

    expect(window.api.deleteHistory).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /^confirm$/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^confirm$/i }))

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

  it('requires confirmation before deleting all history', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: /delete all/i }))

    await user.click(screen.getByRole('button', { name: /delete all/i }))

    expect(window.api.clearHistory).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /confirm/i }))

    expect(window.api.clearHistory).toHaveBeenCalled()
    expect(screen.queryByText('Hello world from Groq')).not.toBeInTheDocument()
    expect(screen.getByText(/no recordings yet/i)).toBeInTheDocument()
  })

  it('cancels delete-all when Cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: /delete all/i }))

    await user.click(screen.getByRole('button', { name: /delete all/i }))
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(window.api.clearHistory).not.toHaveBeenCalled()
    expect(screen.getByText('Hello world from Groq')).toBeInTheDocument()
  })

  it('shows raw transcription toggle when entry has transcript', async () => {
    const entryWithRaw: HistoryEntry = {
      ...entry1,
      id: 'raw-1',
      processed: 'Post-processed text.',
      transcript: 'raw transcription here'
    }
    vi.mocked(window.api.getHistory).mockResolvedValue([entryWithRaw])
    const user = userEvent.setup()

    render(<App />)
    await waitFor(() => screen.getByText('Post-processed text.'))

    expect(screen.queryByText('raw transcription here')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^transcript$/i }))

    expect(screen.getByText('raw transcription here')).toBeInTheDocument()
  })

  it('shows "No results" message when search yields nothing', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => screen.getByLabelText(/search history/i))

    await user.type(screen.getByLabelText(/search history/i), 'zzznomatch')

    expect(screen.getByText(/no results for that query/i)).toBeInTheDocument()
  })
})
