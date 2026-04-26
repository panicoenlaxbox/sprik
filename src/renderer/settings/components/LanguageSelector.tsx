import React from 'react'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' }
] as const

interface Props {
  language: string | undefined
  onChange: (language: string | undefined) => void
}

export default function LanguageSelector({ language, onChange }: Props): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="language-select" className="text-xs text-gray-500 dark:text-gray-400">
        Language
      </label>
      <select
        id="language-select"
        aria-label="Language"
        value={language ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="w-fit text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
      >
        <option value="">System language</option>
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </div>
  )
}
