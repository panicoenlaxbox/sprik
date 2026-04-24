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
    if (capturing) inputRef.current?.focus()
  }, [capturing])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    e.preventDefault()
    e.stopPropagation()

    if (e.key === 'Escape') {
      setCapturing(false)
      return
    }

    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return

    const parts: string[] = []
    if (e.ctrlKey) parts.push('Ctrl')
    if (e.altKey) parts.push('Alt')
    if (e.shiftKey) parts.push('Shift')
    if (e.metaKey) parts.push('Meta')
    parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key)

    onChange(parts.join('+'))
    setCapturing(false)
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-36">{label}</span>

      {capturing ? (
        <input
          ref={inputRef}
          readOnly
          onKeyDown={handleKeyDown}
          onBlur={() => setCapturing(false)}
          value=""
          placeholder="Press keys…"
          aria-label={`Capturing shortcut for ${label}`}
          className="text-sm border border-blue-400 rounded-md px-3 py-1.5 bg-blue-50 focus:outline-none w-48 placeholder:text-blue-400"
        />
      ) : (
        <button
          onClick={() => setCapturing(true)}
          aria-label={`Change shortcut for ${label}: currently ${value}`}
          className="text-sm font-mono border border-gray-300 rounded-md px-3 py-1.5 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 text-left"
        >
          {value}
        </button>
      )}
    </div>
  )
}
