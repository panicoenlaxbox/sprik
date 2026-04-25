import React, { useState, useEffect } from 'react'
import ProviderSelector from './components/ProviderSelector'
import ApiKeyInput from './components/ApiKeyInput'
import HotkeyRebinder from './components/HotkeyRebinder'
import PostProcessSettings from './components/PostProcessSettings'
import StorageSettings from './components/StorageSettings'
import MicrophoneSelector from './components/MicrophoneSelector'
import LanguageSelector from './components/LanguageSelector'
import type { Config, ApiProvider, ApiKeyStatus } from '../shared/types'

interface Props {
  onThemeChange?: (theme: 'system' | 'light' | 'dark') => void
}

export default function App({ onThemeChange }: Props): React.JSX.Element {
  const [config, setConfigState] = useState<Config | null>(null)
  const [keyStatus, setKeyStatus] = useState<ApiKeyStatus | null>(null)
  const [pendingKeys, setPendingKeys] = useState<Partial<Record<ApiProvider, string>>>({})
  const [saving, setSaving] = useState(false)
  const [savedBadge, setSavedBadge] = useState(false)

  const [recordingsPath, setRecordingsPath] = useState('')

  useEffect(() => {
    const providers: ApiProvider[] = ['anthropic', 'groq', 'openai']
    Promise.all([
      window.api.getConfig(),
      window.api.getApiKeyStatus(),
      window.api.getRecordingsPath(),
      ...providers.map((p) => window.api.getApiKey(p))
    ]).then(([cfg, status, recPath, ...keys]) => {
      setConfigState(cfg as Config)
      setKeyStatus(status as ApiKeyStatus)
      setRecordingsPath(recPath as string)
      const initial: Partial<Record<ApiProvider, string>> = {}
      providers.forEach((p, i) => { if (keys[i]) initial[p] = keys[i] as string })
      setPendingKeys(initial)
    })
  }, [])

  const shortcutConflict = config?.shortcuts.toggleRecording === config?.shortcuts.cancelRecording
  const emptyPrompt = config?.postProcessing.enabled && !config.postProcessing.prompt.trim()

  async function handleSave(): Promise<void> {
    if (!config || shortcutConflict || emptyPrompt) return
    setSaving(true)
    try {
      await window.api.setConfig(config)
      const providers: ApiProvider[] = ['anthropic', 'groq', 'openai']
      for (const [provider, key] of Object.entries(pendingKeys) as [ApiProvider, string][]) {
        if (key.trim()) {
          await window.api.setApiKey(provider, key.trim())
        } else if (key === '' && keyStatus[provider]) {
          await window.api.clearApiKey(provider)
        }
      }
      const [newStatus, ...keys] = await Promise.all([
        window.api.getApiKeyStatus(),
        ...providers.map((p) => window.api.getApiKey(p))
      ])
      setKeyStatus(newStatus as ApiKeyStatus)
      const refreshed: Partial<Record<ApiProvider, string>> = {}
      providers.forEach((p, i) => { if (keys[i]) refreshed[p] = keys[i] as string })
      setPendingKeys(refreshed)
      onThemeChange?.(config.ui.theme)
      setSavedBadge(true)
      setTimeout(() => setSavedBadge(false), 2000)
    } finally {
      setSaving(false)
    }
  }


  if (!config || !keyStatus) {
    return (
      <div className="h-full bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-950 flex flex-col">
      <header className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Settings</h1>
      </header>

      <main className="flex-1 p-6 space-y-8 overflow-y-auto">
        <section aria-labelledby="transcription-heading">
          <h2 id="transcription-heading" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Transcription
          </h2>
          <div className="flex flex-col gap-3">
            <ProviderSelector
              provider={config.transcription.provider}
              model={config.transcription.model}
              onChange={(provider, model) =>
                setConfigState({ ...config, transcription: { ...config.transcription, provider, model } })
              }
            />
            <LanguageSelector
              language={config.transcription.language}
              onChange={(language) =>
                setConfigState({ ...config, transcription: { ...config.transcription, language } })
              }
            />
            <MicrophoneSelector
              deviceId={config.transcription.deviceId}
              onChange={(deviceId) =>
                setConfigState({ ...config, transcription: { ...config.transcription, deviceId } })
              }
            />
          </div>
        </section>

        <section aria-labelledby="post-process-heading">
          <h2 id="post-process-heading" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Post-processing
          </h2>
          <PostProcessSettings
            config={config.postProcessing}
            onChange={(updates) =>
              setConfigState({ ...config, postProcessing: { ...config.postProcessing, ...updates } })
            }
          />
          {emptyPrompt && (
            <p className="text-xs text-red-600 mt-2" role="alert">
              A prompt is required when post-processing is enabled.
            </p>
          )}
        </section>

        <section aria-labelledby="api-keys-heading">
          <h2 id="api-keys-heading" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            API Keys
          </h2>
          <div className="space-y-3">
            {(['anthropic', 'groq', 'openai'] as ApiProvider[]).map((provider) => (
              <ApiKeyInput
                key={provider}
                label={provider === 'openai' ? 'OpenAI' : provider === 'groq' ? 'Groq' : 'Anthropic'}
                isSet={keyStatus[provider]}
                value={pendingKeys[provider] ?? ''}
                onChange={(v) => setPendingKeys({ ...pendingKeys, [provider]: v })}
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="shortcuts-heading">
          <h2 id="shortcuts-heading" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
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
            {shortcutConflict && (
              <p className="text-xs text-red-600" role="alert">
                Toggle and Cancel shortcuts cannot be the same.
              </p>
            )}
          </div>
        </section>

        <section aria-labelledby="paste-heading">
          <h2 id="paste-heading" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Paste
          </h2>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
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

        <section aria-labelledby="autostart-heading">
          <h2 id="autostart-heading" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Startup
          </h2>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={config.autostart.enabled}
              onChange={(e) =>
                setConfigState({ ...config, autostart: { enabled: e.target.checked } })
              }
              className="rounded"
              aria-label="Launch Murmur at login"
            />
            Launch at login
          </label>
        </section>

        <section aria-labelledby="storage-heading">
          <h2 id="storage-heading" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Data
          </h2>
          <StorageSettings
            config={config.recordings}
            recordingsPath={recordingsPath}
            onChange={(updates) =>
              setConfigState({ ...config, recordings: { ...config.recordings, ...updates } })
            }
          />
        </section>

        <section aria-labelledby="appearance-heading">
          <h2 id="appearance-heading" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Appearance
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400 w-20">Theme</span>
            <select
              value={config.ui.theme}
              onChange={(e) => {
                const theme = e.target.value as 'system' | 'light' | 'dark'
                setConfigState({ ...config, ui: { theme } })
                onThemeChange?.(theme)
              }}
              className="w-fit text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </section>
      </main>

      <footer className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center gap-3">
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
