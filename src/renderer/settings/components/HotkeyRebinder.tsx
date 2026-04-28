import React, { useState, useEffect, useRef } from 'react'
import { RotateCcw } from 'lucide-react'

interface Props {
  label: string
  value: string
  defaultValue: string
  onChange: (combo: string) => void
}

export default function HotkeyRebinder({
  label,
  value,
  defaultValue,
  onChange
}: Props): React.JSX.Element {
  const [capturing, setCapturing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (capturing) {
      inputRef.current?.focus()
      window.api.pauseShortcuts()
    } else {
      window.api.resumeShortcuts()
    }
  }, [capturing])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    e.preventDefault()
    e.stopPropagation()

    if (e.key === 'Escape') {
      setCapturing(false)
      return
    }
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return
    if (e.key.length === 1 && !/^[\x20-\x7E]$/.test(e.key)) return

    const parts: string[] = []
    if (e.ctrlKey) parts.push('Ctrl')
    if (e.altKey) parts.push('Alt')
    if (e.shiftKey) parts.push('Shift')
    if (e.metaKey) parts.push('Meta')
    const keyLabel =
      e.key === ' '
        ? 'Space'
        : e.key === '+'
          ? 'Plus'
          : e.key.length === 1
            ? e.key.toUpperCase()
            : e.key
    parts.push(keyLabel)

    onChange(parts.join('+'))
    setCapturing(false)
  }

  const keys = value.split('+')

  return (
    <div className="contents">
      <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{label}</span>

      <div className="flex items-center gap-2">
        {capturing ? (
          <input
            ref={inputRef}
            readOnly
            onKeyDown={handleKeyDown}
            onBlur={() => setCapturing(false)}
            value=""
            placeholder="Press keys..."
            aria-label={`Capturing shortcut for ${label}`}
            className="text-sm border border-blue-400 rounded-md px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500 focus:outline-none w-48 placeholder:text-blue-400 dark:placeholder:text-blue-500 dark:text-blue-300"
          />
        ) : (
          <button
            onClick={() => setCapturing(true)}
            aria-label={`Change shortcut for ${label}: currently ${value}`}
            className="flex items-center gap-1 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 w-48"
          >
            {keys.map((k, i) => (
              <kbd
                key={i}
                className="inline-flex items-center px-1.5 py-0.5 text-xs font-mono font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-[0_1px_0_rgba(0,0,0,0.2)]"
              >
                {k}
              </kbd>
            ))}
          </button>
        )}

        {!capturing && value !== defaultValue && (
          <button
            onClick={() => onChange(defaultValue)}
            title="Reset to default"
            aria-label={`Reset ${label} to default`}
            className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 rounded transition-colors"
          >
            <RotateCcw size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
