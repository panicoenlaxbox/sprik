import React from 'react'
import type { Config } from '../../shared/types'

const LLM_PROVIDERS = {
  anthropic: {
    label: 'Anthropic',
    models: ['claude-haiku-4-5-20251001', 'claude-opus-4-7', 'claude-sonnet-4-6']
  },
  openai: {
    label: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini']
  }
} as const

type LLMProvider = keyof typeof LLM_PROVIDERS

interface Props {
  config: Config['postProcess']
  onChange: (updates: Partial<Config['postProcess']>) => void
}

export default function PostProcessSettings({ config, onChange }: Props): React.JSX.Element {
  function handleProviderChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    const next = e.target.value as LLMProvider
    onChange({ provider: next, model: LLM_PROVIDERS[next].models[0] })
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
              <label htmlFor="llm-provider-select" className="text-xs text-gray-500 dark:text-gray-400">Provider</label>
              <select
                id="llm-provider-select"
                aria-label="LLM Provider"
                value={config.provider}
                onChange={handleProviderChange}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                {(Object.keys(LLM_PROVIDERS) as LLMProvider[]).map((p) => (
                  <option key={p} value={p}>{LLM_PROVIDERS[p].label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="llm-model-select" className="text-xs text-gray-500 dark:text-gray-400">Model</label>
              <select
                id="llm-model-select"
                aria-label="LLM Model"
                value={config.model}
                onChange={(e) => onChange({ model: e.target.value })}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                {LLM_PROVIDERS[config.provider].models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="system-prompt" className="text-xs text-gray-500 dark:text-gray-400">Instructions</label>
            <textarea
              id="system-prompt"
              aria-label="Instructions"
              value={config.systemPrompt}
              onChange={(e) => onChange({ systemPrompt: e.target.value })}
              rows={4}
              placeholder="Instructions to process the transcription…"
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 placeholder:text-gray-400 dark:placeholder:text-gray-500 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        </div>
      )}
    </div>
  )
}
