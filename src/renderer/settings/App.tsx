import React, { useState, useEffect } from 'react'
import ProviderSelector from './components/ProviderSelector'
import ApiKeyInput from './components/ApiKeyInput'
import HotkeyRebinder from './components/HotkeyRebinder'
import PostProcessSettings from './components/PostProcessSettings'
import type { Config, ApiProvider, ApiKeyStatus } from '../shared/types'

export default function App(): React.JSX.Element {
  const [config, setConfigState] = useState<Config | null>(null)
  const [keyStatus, setKeyStatus] = useState<ApiKeyStatus | null>(null)
  const [pendingKeys, setPendingKeys] = useState<Partial<Record<ApiProvider, string>>>({})
  const [saving, setSaving] = useState(false)
  const [savedBadge, setSavedBadge] = useState(false)

  useEffect(() => {
    Promise.all([window.api.getConfig(), window.api.getApiKeyStatus()]).then(([cfg, status]) => {
      setConfigState(cfg)
      setKeyStatus(status)
    })
  }, [])

  async function handleSave(): Promise<void> {
    if (!config) return
    setSaving(true)
    try {
      await window.api.setConfig(config)
      for (const [provider, key] of Object.entries(pendingKeys) as [ApiProvider, string][]) {
        if (key.trim()) await window.api.setApiKey(provider, key.trim())
      }
      const newStatus = await window.api.getApiKeyStatus()
      setKeyStatus(newStatus)
      setPendingKeys({})
      setSavedBadge(true)
      setTimeout(() => setSavedBadge(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function handleClearKey(provider: ApiProvider): Promise<void> {
    await window.api.clearApiKey(provider)
    setKeyStatus((prev) => prev ? { ...prev, [provider]: false } : prev)
  }

  if (!config || !keyStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="px-6 py-4 border-b border-gray-200 bg-white">
        <h1 className="text-lg font-semibold text-gray-900">Murmur Settings</h1>
      </header>

      <main className="flex-1 p-6 space-y-8 overflow-y-auto">
        <section aria-labelledby="transcription-heading">
          <h2 id="transcription-heading" className="text-sm font-medium text-gray-700 mb-3">
            Transcription
          </h2>
          <ProviderSelector
            provider={config.transcription.provider}
            model={config.transcription.model}
            onChange={(provider, model) =>
              setConfigState({ ...config, transcription: { ...config.transcription, provider, model } })
            }
          />
        </section>

        <section aria-labelledby="api-keys-heading">
          <h2 id="api-keys-heading" className="text-sm font-medium text-gray-700 mb-3">
            API Keys
          </h2>
          <div className="space-y-3">
            {(['openai', 'groq', 'anthropic'] as ApiProvider[]).map((provider) => (
              <ApiKeyInput
                key={provider}
                label={provider === 'openai' ? 'OpenAI' : provider === 'groq' ? 'Groq' : 'Anthropic'}
                isSet={keyStatus[provider]}
                value={pendingKeys[provider] ?? ''}
                onChange={(v) => setPendingKeys({ ...pendingKeys, [provider]: v })}
                onClear={() => handleClearKey(provider)}
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="post-process-heading">
          <h2 id="post-process-heading" className="text-sm font-medium text-gray-700 mb-3">
            Post-processing
          </h2>
          <PostProcessSettings
            config={config.postProcess}
            onChange={(updates) =>
              setConfigState({ ...config, postProcess: { ...config.postProcess, ...updates } })
            }
          />
        </section>

        <section aria-labelledby="shortcuts-heading">
          <h2 id="shortcuts-heading" className="text-sm font-medium text-gray-700 mb-3">
            Shortcuts
          </h2>
          <div className="space-y-3">
            <HotkeyRebinder
              label="Toggle recording"
              value={config.shortcuts.toggleRecording}
              onChange={(v) =>
                setConfigState({ ...config, shortcuts: { ...config.shortcuts, toggleRecording: v } })
              }
            />
            <HotkeyRebinder
              label="Cancel recording"
              value={config.shortcuts.cancelRecording}
              onChange={(v) =>
                setConfigState({ ...config, shortcuts: { ...config.shortcuts, cancelRecording: v } })
              }
            />
          </div>
        </section>

        <section aria-labelledby="paste-heading">
          <h2 id="paste-heading" className="text-sm font-medium text-gray-700 mb-3">
            Paste
          </h2>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={config.paste.autoPaste}
              onChange={(e) =>
                setConfigState({ ...config, paste: { autoPaste: e.target.checked } })
              }
              className="rounded"
            />
            Auto-paste after transcription
          </label>
        </section>
      </main>

      <footer className="px-6 py-4 border-t border-gray-200 bg-white flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {savedBadge && (
          <span className="text-sm text-green-600" role="status">
            Settings saved
          </span>
        )}
      </footer>
    </div>
  )
}
