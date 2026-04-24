import React, { useState } from 'react'

interface Props {
  label: string
  isSet: boolean
  value: string
  onChange: (value: string) => void
  onClear: () => void
}

export default function ApiKeyInput({ label, isSet, value, onChange, onClear }: Props): React.JSX.Element {
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-20">{label}</span>

      <div className="relative flex-1">
        <input
          type="password"
          aria-label={`${label} API key`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isSet ? 'Key saved — type to replace' : 'Enter API key…'}
          autoComplete="off"
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
        />
      </div>

      {isSet && !showClearConfirm && (
        <span
          className="text-xs text-green-600 font-medium whitespace-nowrap"
          aria-label={`${label} key is set`}
        >
          Key saved
        </span>
      )}

      {isSet && (
        showClearConfirm ? (
          <div className="flex gap-1">
            <button
              onClick={() => { onClear(); setShowClearConfirm(false) }}
              className="text-xs text-red-600 hover:underline"
            >
              Confirm
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="text-xs text-gray-500 hover:underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowClearConfirm(true)}
            aria-label={`Clear ${label} key`}
            className="text-xs text-gray-400 hover:text-red-500"
          >
            Clear
          </button>
        )
      )}
    </div>
  )
}
