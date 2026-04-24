import React, { useState, useEffect } from 'react'
import type { HistoryEntry } from '../shared/types'

export default function App(): React.JSX.Element {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.getHistory().then((data) => {
      setEntries(data)
      setLoading(false)
    })
  }, [])

  const filtered = entries.filter((e) =>
    e.text.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete(id: string): Promise<void> {
    await window.api.deleteHistory(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  async function handleClear(): Promise<void> {
    await window.api.clearHistory()
    setEntries([])
  }

  async function handleExport(): Promise<void> {
    const json = await window.api.exportHistory()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `murmur-history-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleCopy(text: string): Promise<void> {
    await window.api.copyToClipboard(text)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="px-6 py-4 border-b border-gray-200 bg-white">
        <h1 className="text-lg font-semibold text-gray-900">Murmur — History</h1>
      </header>

      <div className="px-6 py-3 border-b border-gray-200 bg-white flex items-center gap-3">
        <input
          type="search"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search history"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleExport}
          disabled={entries.length === 0}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Export JSON
        </button>
        <button
          onClick={handleClear}
          disabled={entries.length === 0}
          className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
        >
          Clear all
        </button>
      </div>

      <main className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center mt-12">
            {search ? 'No results for that query.' : 'No transcriptions yet.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((entry) => (
              <li key={entry.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-gray-800 flex-1 whitespace-pre-wrap">{entry.text}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCopy(entry.text)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-xs font-medium text-red-500 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(entry.timestamp).toLocaleString()} · {entry.provider} / {entry.model}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
