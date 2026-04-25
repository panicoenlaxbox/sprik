import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, FolderOpen, Copy, Trash2, Check, X, Info } from 'lucide-react'
import type { HistoryEntry } from '../shared/types'

export default function App(): React.JSX.Element {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedRaw, setExpandedRaw] = useState<Set<string>>(new Set())
  const [expandedInfo, setExpandedInfo] = useState<Set<string>>(new Set())

  useEffect(() => {
    window.api.getHistory().then((data) => {
      setEntries(data)
      setLoading(false)
    })
  }, [])

  const filtered = entries.filter((e) =>
    e.processed.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete(id: string): Promise<void> {
    await window.api.deleteHistory(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  async function handleClear(): Promise<void> {
    await window.api.clearHistory()
    setEntries([])
    setConfirmClear(false)
  }

  async function handleCopy(id: string, text: string): Promise<void> {
    await window.api.copyToClipboard(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  if (loading) {
    return (
      <div className="h-full bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-950 flex flex-col">
      <header className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">History</h1>
      </header>

      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center gap-3">
        <input
          type="search"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search history"
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
        {confirmClear ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Delete all?</span>
            <button
              onClick={handleClear}
              className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClear(true)}
            disabled={entries.length === 0}
            className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
          >
            Delete all
          </button>
        )}
      </div>

      <main className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center mt-12">
            {search ? 'No results for that query.' : 'No recordings yet.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((entry) => (
              <li key={entry.id} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-gray-800 dark:text-gray-100 flex-1 whitespace-pre-wrap">{entry.processed}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    {entry.path && (
                      <button
                        onClick={() => window.api.openPath(entry.path!)}
                        title="Open folder"
                        aria-label="Open folder"
                        className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded cursor-pointer"
                      >
                        <FolderOpen size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedInfo((prev) => {
                        const next = new Set(prev)
                        next.has(entry.id) ? next.delete(entry.id) : next.add(entry.id)
                        return next
                      })}
                      title="Details"
                      aria-label="Details"
                      className={`p-1.5 rounded transition-colors ${expandedInfo.has(entry.id) ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400'}`}
                    >
                      <Info size={14} />
                    </button>
                    <button
                      onClick={() => handleCopy(entry.id, entry.processed)}
                      title="Copy"
                      aria-label="Copy"
                      className={`p-1.5 rounded transition-colors ${copiedId === entry.id ? 'text-green-500' : 'text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400'}`}
                    >
                      {copiedId === entry.id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                    {confirmDeleteId === entry.id ? (
                      <>
                        <button
                          onClick={() => { handleDelete(entry.id); setConfirmDeleteId(null) }}
                          title="Confirm"
                          aria-label="Confirm"
                          className="p-1.5 text-white bg-red-500 rounded hover:bg-red-600"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          title="Cancel"
                          aria-label="Cancel delete"
                          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 rounded"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(entry.id)}
                        title="Delete"
                        aria-label="Delete"
                        className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {entry.transcript && (
                  <div className="mt-2">
                    <button
                      onClick={() => setExpandedRaw((prev) => {
                        const next = new Set(prev)
                        next.has(entry.id) ? next.delete(entry.id) : next.add(entry.id)
                        return next
                      })}
                      className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
                    >
                      {expandedRaw.has(entry.id) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      Transcript
                    </button>
                    {expandedRaw.has(entry.id) && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 italic whitespace-pre-wrap border-l-2 border-gray-200 dark:border-gray-700 pl-2">
                        {entry.transcript}
                      </p>
                    )}
                  </div>
                )}

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {new Date(entry.timestamp).toLocaleString()}
                </p>
                {expandedInfo.has(entry.id) && (
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 space-y-0.5">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      <span className="text-gray-300 dark:text-gray-600">Transcription:</span> {entry.transcription.provider} · {entry.transcription.model}
                    </p>
                    {entry.postProcessing && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        <span className="text-gray-300 dark:text-gray-600">Post-processing:</span> {entry.postProcessing.provider} · {entry.postProcessing.model}
                      </p>
                    )}
                    {entry.language && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        <span className="text-gray-300 dark:text-gray-600">Language:</span> {entry.language}
                      </p>
                    )}
                    {entry.microphone && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        <span className="text-gray-300 dark:text-gray-600">Microphone:</span> {entry.microphone}
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
