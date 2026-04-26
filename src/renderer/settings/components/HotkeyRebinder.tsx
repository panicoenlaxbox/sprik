import React, { useState, useEffect, useRef } from 'react'

interface Props {
  label: string
  value: string
  onChange: (combo: string) => void
}

export default function HotkeyRebinder({ label, value, onChange }: Props): React.JSX.Element {
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

    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return
    if (e.key.length === 1 && !/^[\x20-\x7E]$/.test(e.key)) return

    const parts: string[] = []
    if (e.ctrlKey) parts.push('Ctrl')
    if (e.altKey) parts.push('Alt')
    if (e.shiftKey) parts.push('Shift')
    if (e.metaKey) parts.push('Meta')
    const keyLabel = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key
    parts.push(keyLabel)

    onChange(parts.join('+'))
    setCapturing(false)
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 dark:text-gray-400 w-36">{label}</span>

      {capturing ? (
        <input
          ref={inputRef}
          readOnly
          onKeyDown={handleKeyDown}
          onBlur={() => setCapturing(false)}
          value=""
          placeholder="Press keys…"
          aria-label={`Capturing shortcut for ${label}`}
          className="text-sm border border-blue-400 rounded-md px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500 focus:outline-none w-48 placeholder:text-blue-400 dark:placeholder:text-blue-500 dark:text-blue-300"
        />
      ) : (
        <button
          onClick={() => setCapturing(true)}
          aria-label={`Change shortcut for ${label}: currently ${value}`}
          className="text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 w-48 text-left"
        >
          {value}
        </button>
      )}
    </div>
  )
}
