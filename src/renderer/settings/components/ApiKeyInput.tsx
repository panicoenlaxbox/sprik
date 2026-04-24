import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface Props {
  label: string
  isSet: boolean
  value: string
  onChange: (value: string) => void
}

export default function ApiKeyInput({ label, isSet, value, onChange }: Props): React.JSX.Element {
  const [showKey, setShowKey] = useState(false)

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-20">{label}</span>

      <div className="relative flex-1">
        <input
          type={showKey ? 'text' : 'password'}
          aria-label={`${label} API key`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isSet ? 'Enter new key to replace…' : 'Enter API key…'}
          autoComplete="new-password"
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 pr-9 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
        />
        <button
          type="button"
          onClick={() => setShowKey((v) => !v)}
          aria-label={showKey ? 'Hide key' : 'Show key'}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}
