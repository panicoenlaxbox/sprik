import React from 'react'
import type { Config } from '../../shared/types'

const LLM_PROVIDERS: Record<string, { label: string; models: string[] }> = {
  anthropic: {
    label: 'Anthropic',
    models: ['claude-haiku-4-5', 'claude-sonnet-4-6', 'claude-opus-4-7']
  },
  openai: {
    label: 'OpenAI',
    models: ['gpt-5.4-mini', 'gpt-5.4', 'gpt-5.5']
  },
  azure: {
    label: 'Microsoft Foundry',
    models: []
  }
}

type LLMProvider = keyof typeof LLM_PROVIDERS

interface Props {
  config: Config['postProcessing']
  onChange: (updates: Partial<Config['postProcessing']>) => void
}

export default function PostProcessSettings({ config, onChange }: Props): React.JSX.Element {
  function handleProviderChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    const next = e.target.value as LLMProvider
    const firstModel = LLM_PROVIDERS[next]?.models[0] ?? ''
    onChange({
      provider: next as Config['postProcessing']['provider'],
      model: firstModel,
      endpoint: ''
    })
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
        <input
          type="checkbox"
          aria-label="Enable post-processing"
          checked={config.enabled}
          onChange={(e) => onChange({ enabled: e.target.checked })}
          className="rounded"
        />
        Enable
      </label>

      {config.enabled && (
        <div className="ml-6 space-y-3 border-l-2 border-blue-100 dark:border-blue-900/40 pl-4">
          <div className="flex gap-3">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="llm-provider-select"
                className="text-xs text-gray-500 dark:text-gray-400"
              >
                Provider
              </label>
              <select
                id="llm-provider-select"
                aria-label="LLM Provider"
                value={config.provider}
                onChange={handleProviderChange}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                {(Object.keys(LLM_PROVIDERS) as LLMProvider[]).map((p) => (
                  <option key={p} value={p}>
                    {LLM_PROVIDERS[p].label}
                  </option>
                ))}
              </select>
            </div>

            {config.provider !== 'azure' && (
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="llm-model-select"
                  className="text-xs text-gray-500 dark:text-gray-400"
                >
                  Model
                </label>
                <select
                  id="llm-model-select"
                  aria-label="LLM Model"
                  value={config.model}
                  onChange={(e) => onChange({ model: e.target.value })}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  {LLM_PROVIDERS[config.provider]?.models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {config.provider === 'azure' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="llm-azure-endpoint"
                  className="text-xs text-gray-500 dark:text-gray-400"
                >
                  Endpoint
                </label>
                <input
                  id="llm-azure-endpoint"
                  type="url"
                  aria-label="LLM Azure Endpoint"
                  value={config.endpoint ?? ''}
                  onChange={(e) => onChange({ endpoint: e.target.value })}
                  placeholder="https://your-resource.openai.azure.com"
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="llm-azure-deployment"
                  className="text-xs text-gray-500 dark:text-gray-400"
                >
                  Deployment
                </label>
                <input
                  id="llm-azure-deployment"
                  type="text"
                  aria-label="LLM Azure Deployment"
                  value={config.model}
                  onChange={(e) => onChange({ model: e.target.value })}
                  placeholder="your-deployment"
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="system-prompt" className="text-xs text-gray-500 dark:text-gray-400">
              Instructions
            </label>
            <textarea
              id="system-prompt"
              aria-label="Instructions"
              value={config.prompt}
              onChange={(e) => onChange({ prompt: e.target.value })}
              rows={4}
              placeholder="Instructions to process the transcription..."
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 placeholder:text-gray-400 dark:placeholder:text-gray-500 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        </div>
      )}
    </div>
  )
}
