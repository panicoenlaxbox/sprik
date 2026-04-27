import React from 'react'
import { TRANSCRIPTION_PROVIDERS } from '../../shared/types'

const PROVIDERS = TRANSCRIPTION_PROVIDERS
type Provider = keyof typeof PROVIDERS

interface Props {
  provider: Provider
  model: string
  endpoint?: string
  onChange: (provider: Provider, model: string, endpoint?: string) => void
}

export default function ProviderSelector({
  provider,
  model,
  endpoint,
  onChange
}: Props): React.JSX.Element {
  function handleProviderChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    const next = e.target.value as Provider
    const firstModel = (PROVIDERS[next].models as readonly string[])[0] ?? ''
    onChange(next, firstModel, '')
  }

  function handleModelChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    onChange(provider, e.target.value, endpoint)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="provider-select" className="text-xs text-gray-500 dark:text-gray-400">
            Provider
          </label>
          <select
            id="provider-select"
            aria-label="Provider"
            value={provider}
            onChange={handleProviderChange}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            {(Object.keys(PROVIDERS) as Provider[]).map((p) => (
              <option key={p} value={p}>
                {PROVIDERS[p].label}
              </option>
            ))}
          </select>
        </div>

        {provider !== 'azure' && (
          <div className="flex flex-col gap-1">
            <label htmlFor="model-select" className="text-xs text-gray-500 dark:text-gray-400">
              Model
            </label>
            <select
              id="model-select"
              aria-label="Model"
              value={model}
              onChange={handleModelChange}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              {PROVIDERS[provider].models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {provider === 'azure' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="azure-endpoint" className="text-xs text-gray-500 dark:text-gray-400">
              Endpoint
            </label>
            <input
              id="azure-endpoint"
              type="url"
              aria-label="Azure Endpoint"
              value={endpoint ?? ''}
              onChange={(e) => onChange(provider, model, e.target.value)}
              placeholder="https://your-resource.openai.azure.com"
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="azure-deployment" className="text-xs text-gray-500 dark:text-gray-400">
              Deployment
            </label>
            <input
              id="azure-deployment"
              type="text"
              aria-label="Azure Deployment"
              value={model}
              onChange={(e) => onChange(provider, e.target.value, endpoint)}
              placeholder="whisper"
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
        </div>
      )}
    </div>
  )
}
