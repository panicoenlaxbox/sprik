import React from 'react'
import { TRANSCRIPTION_PROVIDERS } from '../../shared/types'

const PROVIDERS = TRANSCRIPTION_PROVIDERS
type Provider = keyof typeof PROVIDERS

interface Props {
  provider: Provider
  model: string
  onChange: (provider: Provider, model: string) => void
}

export default function ProviderSelector({ provider, model, onChange }: Props): React.JSX.Element {
  function handleProviderChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    const next = e.target.value as Provider
    onChange(next, PROVIDERS[next].models[0])
  }

  function handleModelChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    onChange(provider, e.target.value)
  }

  return (
    <div className="flex gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="provider-select" className="text-xs text-gray-500 dark:text-gray-400">Provider</label>
        <select
          id="provider-select"
          aria-label="Provider"
          value={provider}
          onChange={handleProviderChange}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          {(Object.keys(PROVIDERS) as Provider[]).map((p) => (
            <option key={p} value={p}>{PROVIDERS[p].label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="model-select" className="text-xs text-gray-500 dark:text-gray-400">Model</label>
        <select
          id="model-select"
          aria-label="Model"
          value={model}
          onChange={handleModelChange}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          {PROVIDERS[provider].models.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
