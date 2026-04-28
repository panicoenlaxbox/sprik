import React, { useState, useEffect } from 'react'
import { FolderOpen, Copy, Trash2, Check, X, Info } from 'lucide-react'
import { JSONTree } from 'react-json-tree'
import type { HistoryEntry } from '../shared/types'
import { relativeFromNow, absoluteFormat } from '../shared/relativeTime'

const DARK_THEME = {
  scheme: 'sprik-dark',
  base00: 'transparent',
  base01: '#1e293b',
  base02: '#334155',
  base03: '#64748b',
  base04: '#94a3b8',
  base05: '#e2e8f0',
  base06: '#f1f5f9',
  base07: '#f8fafc',
  base08: '#f87171',
  base09: '#fb923c',
  base0A: '#fbbf24',
  base0B: '#4ade80',
  base0C: '#22d3ee',
  base0D: '#60a5fa',
  base0E: '#a78bfa',
  base0F: '#f472b6'
}

const LIGHT_THEME = {
  scheme: 'sprik-light',
  base00: 'transparent',
  base01: '#f1f5f9',
  base02: '#e2e8f0',
  base03: '#94a3b8',
  base04: '#64748b',
  base05: '#1e293b',
  base06: '#0f172a',
  base07: '#020617',
  base08: '#dc2626',
  base09: '#d97706',
  base0A: '#b45309',
  base0B: '#16a34a',
  base0C: '#0891b2',
  base0D: '#2563eb',
  base0E: '#7c3aed',
  base0F: '#db2777'
}

function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return isDark
}

export default function App(): React.JSX.Element {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null)
  const [jsonCopied, setJsonCopied] = useState(false)
  const [tick, setTick] = useState(0)

  const isDark = useIsDark()

  useEffect(() => {
    window.api.getHistory().then((data) => {
      setEntries(data)
      setLoading(false)
    })
    return window.api.onHistoryEntryAdded((entry) => {
      setEntries((prev) => [entry, ...prev])
    })
  }, [])

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  void tick

  const filtered = entries.filter((e) => e.processed.toLowerCase().includes(search.toLowerCase()))

  async function handleDelete(id: string): Promise<void> {
    if (!window.confirm('Delete this entry?')) return
    await window.api.deleteHistory(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
    if (selectedEntry?.id === id) setSelectedEntry(null)
  }

  async function handleClear(): Promise<void> {
    if (!window.confirm('Delete all entries?')) return
    await window.api.clearHistory()
    setEntries([])
    setSelectedEntry(null)
  }

  async function handleCopy(id: string, text: string): Promise<void> {
    await window.api.copyToClipboard(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  async function handleCopyJson(): Promise<void> {
    if (!selectedEntry) return
    await window.api.copyToClipboard(JSON.stringify(selectedEntry, null, 2))
    setJsonCopied(true)
    setTimeout(() => setJsonCopied(false), 1500)
  }

  if (loading) {
    return (
      <div className="h-full bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-950 flex flex-col relative overflow-hidden">
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
        <button
          onClick={handleClear}
          disabled={entries.length === 0}
          className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
        >
          Delete all
        </button>
      </div>

      <main className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center mt-12">
            {search ? 'No results for that query.' : 'No recordings yet.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((entry) => (
              <li
                key={entry.id}
                className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-gray-800 dark:text-gray-100 flex-1 whitespace-pre-wrap">
                    {entry.processed}
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() =>
                        setSelectedEntry((prev) => (prev?.id === entry.id ? null : entry))
                      }
                      title="Details"
                      aria-label="Details"
                      className={`p-1.5 rounded transition-colors ${selectedEntry?.id === entry.id ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400'}`}
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
                    <button
                      onClick={() => handleDelete(entry.id)}
                      title="Delete"
                      aria-label="Delete"
                      className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p
                  className="text-xs text-gray-500 dark:text-gray-400 mt-2"
                  title={absoluteFormat(entry.timestamp)}
                >
                  {relativeFromNow(entry.timestamp)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>

      {selectedEntry && (
        <div
          className="absolute inset-0 bg-black/20 dark:bg-black/40 z-10"
          onClick={() => setSelectedEntry(null)}
        />
      )}

      <div
        className={`absolute inset-y-0 right-0 w-1/2 bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-700 shadow-xl flex flex-col z-20 transition-transform duration-200 ${selectedEntry ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-start justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Details</span>
            {selectedEntry && (
              <p
                className="text-xs text-gray-500 dark:text-gray-400 mt-0.5"
                title={absoluteFormat(selectedEntry.timestamp)}
              >
                {relativeFromNow(selectedEntry.timestamp)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {selectedEntry?.path && (
              <button
                onClick={() => window.api.openPath(selectedEntry.path!)}
                title="Open folder"
                aria-label="Open folder"
                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded"
              >
                <FolderOpen size={14} />
              </button>
            )}
            <button
              onClick={handleCopyJson}
              title="Copy JSON"
              aria-label="Copy JSON"
              className={`p-1.5 rounded transition-colors ${jsonCopied ? 'text-green-500' : 'text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400'}`}
            >
              {jsonCopied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <button
              onClick={() => setSelectedEntry(null)}
              title="Close"
              aria-label="Close details"
              className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 rounded"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 text-xs">
          {selectedEntry && (
            <JSONTree
              data={selectedEntry}
              theme={isDark ? DARK_THEME : LIGHT_THEME}
              invertTheme={false}
              hideRoot
              shouldExpandNodeInitially={() => true}
            />
          )}
        </div>
      </div>
    </div>
  )
}
