import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowUp } from 'lucide-react'
import type { LogEntry } from '../shared/types'
import { SCOPES } from '../../shared/scopes'
import type { Scope } from '../../shared/scopes'

type LevelFilter = 'all' | 'info' | 'warn' | 'error'
type ScopeFilter = 'all' | Scope

const LEVEL_STYLES: Record<string, string> = {
  info: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
  warn: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
  error: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
}

const LEVEL_ROW_HIGHLIGHT: Record<string, string> = {
  info: '',
  warn: 'bg-amber-50/40 dark:bg-amber-900/10',
  error: 'bg-red-50/40 dark:bg-red-900/10'
}

function formatTs(ts: number): string {
  const d = new Date(ts)
  const DD = d.getDate().toString().padStart(2, '0')
  const MM = (d.getMonth() + 1).toString().padStart(2, '0')
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  const ss = d.getSeconds().toString().padStart(2, '0')
  return `${DD}/${MM} ${hh}:${mm}:${ss}`
}

interface Props {
  entries: LogEntry[]
}

export default function LogsView({ entries }: Props): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all')
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const topRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const filtered = entries.filter((e) => {
    if (levelFilter !== 'all' && e.level !== levelFilter) return false
    if (scopeFilter !== 'all' && e.scope !== scopeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return e.message.toLowerCase().includes(q) || e.scope.toLowerCase().includes(q)
    }
    return true
  })

  const displayed = [...filtered].reverse()

  useEffect(() => {
    if (autoScroll) {
      topRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [filtered.length, autoScroll])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const atTop = el.scrollTop < 40
    setAutoScroll(atTop)
  }, [])

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-950 flex flex-col relative overflow-hidden">
      <header className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Logs</h1>
      </header>

      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0 flex items-center gap-3">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as LevelFilter)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="all">All levels</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
        </select>
        <select
          value={scopeFilter}
          onChange={(e) => setScopeFilter(e.target.value as ScopeFilter)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="all">All scopes</option>
          {(Object.values(SCOPES) as Scope[]).sort().map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {(search !== '' || levelFilter !== 'all' || scopeFilter !== 'all') && (
          <button
            onClick={() => {
              setSearch('')
              setLevelFilter('all')
              setScopeFilter('all')
            }}
            className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors whitespace-nowrap cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 text-xs"
      >
        <div ref={topRef} />
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm font-sans text-gray-400 dark:text-gray-500">
              {entries.length === 0 ? 'No log entries yet.' : 'No entries match the filter.'}
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse table-fixed">
            <tbody>
              {displayed.map((entry, i) => (
                <tr
                  key={i}
                  className={`border-b border-gray-100 dark:border-gray-800/60 ${LEVEL_ROW_HIGHLIGHT[entry.level]}`}
                >
                  <td className="px-3 py-1 whitespace-nowrap text-gray-400 dark:text-gray-500 select-none w-[118px]">
                    {formatTs(entry.ts)}
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap w-[52px]">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${LEVEL_STYLES[entry.level]}`}
                    >
                      {entry.level}
                    </span>
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-indigo-600 dark:text-indigo-400 w-[100px] truncate max-w-[100px]">
                    {entry.scope}
                  </td>
                  <td className="px-2 py-1 text-gray-800 dark:text-gray-200 break-all">
                    {entry.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!autoScroll && (
        <div className="absolute bottom-4 right-8">
          <button
            onClick={() => {
              setAutoScroll(true)
              topRef.current?.scrollIntoView({ behavior: 'smooth' })
            }}
            title="Jump to top"
            className="w-9 h-9 flex items-center justify-center bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full shadow-lg hover:opacity-90 transition-opacity"
          >
            <ArrowUp size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
