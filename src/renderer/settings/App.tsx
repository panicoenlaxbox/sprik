import React, { useState, useEffect } from 'react'
import ProviderSelector from './components/ProviderSelector'
import ApiKeyInput from './components/ApiKeyInput'
import HotkeyRebinder from './components/HotkeyRebinder'
import PostProcessSettings from './components/PostProcessSettings'
import StorageSettings from './components/StorageSettings'
import MicrophoneSelector from './components/MicrophoneSelector'
import LanguageSelector from './components/LanguageSelector'
import { API_PROVIDERS } from '../shared/types'
import type { Config, ApiProvider, ApiKeyStatus } from '../shared/types'

interface Props {
  onThemeChange?: (theme: 'system' | 'light' | 'dark') => void
}

const DEFAULT_TOGGLE = 'Ctrl+Alt+Space'
const DEFAULT_CANCEL = 'Escape'

export default function App({ onThemeChange }: Props): React.JSX.Element {
  const [config, setConfigState] = useState<Config | null>(null)
  const [keyStatus, setKeyStatus] = useState<ApiKeyStatus | null>(null)
  const [pendingKeys, setPendingKeys] = useState<Partial<Record<ApiProvider, string>>>({})
  const [saving, setSaving] = useState(false)
  const [savedBadge, setSavedBadge] = useState(false)
  const [toggleShortcutFailed, setToggleShortcutFailed] = useState(false)
  const [positionReset, setPositionReset] = useState(false)
  const [savedSnapshot, setSavedSnapshot] = useState<{
    config: Config
    pendingKeys: Partial<Record<ApiProvider, string>>
  } | null>(null)

  const [recordingsPath, setRecordingsPath] = useState('')
  const [systemLocale, setSystemLocale] = useState('')

  useEffect(() => {
    return window.api.onOverlayPositionChanged((pos) => {
      setConfigState((prev) =>
        prev ? { ...prev, ui: { ...prev.ui, overlayPosition: pos } } : prev
      )
      setSavedSnapshot((prev) =>
        prev
          ? { ...prev, config: { ...prev.config, ui: { ...prev.config.ui, overlayPosition: pos } } }
          : prev
      )
    })
  }, [])

  useEffect(() => {
    Promise.all([
      window.api.getConfig(),
      window.api.getApiKeyStatus(),
      window.api.getRecordingsPath(),
      window.api.getShortcutStatus(),
      window.api.getSystemLocale(),
      ...API_PROVIDERS.map((p) => window.api.getApiKey(p))
    ]).then(([cfg, status, recPath, shortcutStatus, locale, ...keys]) => {
      setConfigState(cfg as Config)
      setKeyStatus(status as ApiKeyStatus)
      setRecordingsPath(recPath as string)
      setToggleShortcutFailed(!(shortcutStatus as { toggleRegistered: boolean }).toggleRegistered)
      setSystemLocale(locale as string)
      const initial: Partial<Record<ApiProvider, string>> = {}
      API_PROVIDERS.forEach((p, i) => {
        if (keys[i]) initial[p] = keys[i] as string
      })
      setPendingKeys(initial)
      setSavedSnapshot({ config: cfg as Config, pendingKeys: initial })
    })
  }, [])

  const isDirty =
    savedSnapshot !== null &&
    (JSON.stringify(config) !== JSON.stringify(savedSnapshot.config) ||
      JSON.stringify(pendingKeys) !== JSON.stringify(savedSnapshot.pendingKeys))

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent): void => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const shortcutConflict = config?.shortcuts.toggleRecording === config?.shortcuts.cancelRecording
  const emptyPrompt = config?.postProcessing.enabled && !config.postProcessing.prompt.trim()
  const invalidRetain =
    config?.history.enabled &&
    (!Number.isInteger(config.history.retain) || config.history.retain < 1)

  function handleDiscard(): void {
    if (!savedSnapshot) return
    setConfigState(savedSnapshot.config)
    setPendingKeys(savedSnapshot.pendingKeys)
    onThemeChange?.(savedSnapshot.config.ui.theme)
    void window.api.previewOverlay({
      overlay: savedSnapshot.config.overlay,
      theme: savedSnapshot.config.ui.theme
    })
  }

  async function handleSave(): Promise<void> {
    if (!config || shortcutConflict || emptyPrompt || invalidRetain) return
    setSaving(true)
    try {
      const { toggleFailed } = await window.api.setConfig(config)
      setToggleShortcutFailed(toggleFailed)
      for (const [provider, key] of Object.entries(pendingKeys) as [ApiProvider, string][]) {
        if (key.trim()) {
          await window.api.setApiKey(provider, key.trim())
        } else if (key === '' && keyStatus?.[provider]) {
          await window.api.clearApiKey(provider)
        }
      }
      const [newStatus, ...keys] = await Promise.all([
        window.api.getApiKeyStatus(),
        ...API_PROVIDERS.map((p) => window.api.getApiKey(p))
      ])
      setKeyStatus(newStatus as ApiKeyStatus)
      const refreshed: Partial<Record<ApiProvider, string>> = {}
      API_PROVIDERS.forEach((p, i) => {
        if (keys[i]) refreshed[p] = keys[i] as string
      })
      setPendingKeys(refreshed)
      setSavedSnapshot({ config, pendingKeys: refreshed })
      onThemeChange?.(config.ui.theme)
      if (!toggleFailed) {
        setSavedBadge(true)
        setTimeout(() => setSavedBadge(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  if (!config || !keyStatus) {
    return (
      <div className="h-full bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
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
          <h2
            id="transcription-heading"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
          >
            Transcription
          </h2>
          <div className="flex flex-col gap-3">
            <ProviderSelector
              provider={config.transcription.provider}
              model={config.transcription.model}
              endpoint={config.transcription.endpoint}
              onChange={(provider, model, endpoint) =>
                setConfigState({
                  ...config,
                  transcription: { ...config.transcription, provider, model, endpoint }
                })
              }
            />
            <LanguageSelector
              language={config.transcription.language}
              systemLocale={systemLocale}
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
          <h2
            id="post-process-heading"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
          >
            Post-processing
          </h2>
          <PostProcessSettings
            config={config.postProcessing}
            onChange={(updates) =>
              setConfigState({
                ...config,
                postProcessing: { ...config.postProcessing, ...updates }
              })
            }
          />
          {emptyPrompt && (
            <p className="text-xs text-red-600 mt-2" role="alert">
              A prompt is required when post-processing is enabled.
            </p>
          )}
        </section>

        <section aria-labelledby="api-keys-heading">
          <h2
            id="api-keys-heading"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
          >
            API Keys
          </h2>
          <div className="grid grid-cols-[max-content_1fr] items-center gap-x-3 gap-y-3">
            {API_PROVIDERS.map((provider) => (
              <ApiKeyInput
                key={provider}
                label={
                  provider === 'openai'
                    ? 'OpenAI'
                    : provider === 'groq'
                      ? 'Groq'
                      : provider === 'azure'
                        ? 'Microsoft Foundry'
                        : 'Anthropic'
                }
                isSet={keyStatus[provider]}
                value={pendingKeys[provider] ?? ''}
                onChange={(v) => setPendingKeys({ ...pendingKeys, [provider]: v })}
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="shortcuts-heading">
          <h2
            id="shortcuts-heading"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
          >
            Shortcuts
          </h2>
          <div className="space-y-3">
            <div className="grid grid-cols-[max-content_auto] items-center gap-x-3 gap-y-3">
              <HotkeyRebinder
                label="Toggle recording"
                value={config.shortcuts.toggleRecording}
                defaultValue={DEFAULT_TOGGLE}
                onChange={(v) => {
                  setToggleShortcutFailed(false)
                  setConfigState({
                    ...config,
                    shortcuts: { ...config.shortcuts, toggleRecording: v }
                  })
                }}
              />
              <HotkeyRebinder
                label="Cancel recording"
                value={config.shortcuts.cancelRecording}
                defaultValue={DEFAULT_CANCEL}
                onChange={(v) =>
                  setConfigState({
                    ...config,
                    shortcuts: { ...config.shortcuts, cancelRecording: v }
                  })
                }
              />
            </div>
            {shortcutConflict && (
              <p className="text-xs text-red-600" role="alert">
                Toggle and Cancel shortcuts cannot be the same.
              </p>
            )}
            {toggleShortcutFailed && !shortcutConflict && (
              <p className="text-xs text-red-600" role="alert">
                This shortcut is already in use by another app.
              </p>
            )}
          </div>
        </section>

        <section aria-label="Paste">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="paste-mode"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              After transcription
            </label>
            <select
              id="paste-mode"
              value={config.pasteMode}
              onChange={(e) =>
                setConfigState({
                  ...config,
                  pasteMode: e.target.value as Config['pasteMode']
                })
              }
              className="w-fit text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1.5"
            >
              <option value="clipboard-and-focus">Copy to clipboard &amp; paste at focus</option>
              <option value="clipboard-only">Copy to clipboard only</option>
              <option value="focus-only">Paste at focus only</option>
            </select>
          </div>
        </section>

        <section aria-labelledby="autostart-heading">
          <h2
            id="autostart-heading"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
          >
            Startup
          </h2>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={config.startup.autostart}
                onChange={(e) =>
                  setConfigState({
                    ...config,
                    startup: { ...config.startup, autostart: e.target.checked }
                  })
                }
                className="rounded"
                aria-label="Launch Sprik at login"
              />
              Launch at login
            </label>
            {window.api.isAutoUpdateSupported() && (
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.startup.autoCheck}
                  onChange={(e) =>
                    setConfigState({
                      ...config,
                      startup: { ...config.startup, autoCheck: e.target.checked }
                    })
                  }
                  className="rounded"
                />
                Check automatically for updates
              </label>
            )}
          </div>
        </section>

        <section aria-labelledby="history-heading">
          <h2
            id="history-heading"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
          >
            History
          </h2>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={config.history.enabled}
                onChange={(e) =>
                  setConfigState({
                    ...config,
                    history: { ...config.history, enabled: e.target.checked }
                  })
                }
                className="rounded"
                aria-label="Enable history"
              />
              Keep transcription history
            </label>
            {config.history.enabled && (
              <>
                <div className="flex items-center gap-3 pl-6">
                  <label
                    htmlFor="history-retain"
                    className="text-sm text-gray-600 dark:text-gray-400 shrink-0"
                  >
                    Keep last
                  </label>
                  <input
                    id="history-retain"
                    type="number"
                    min={1}
                    value={config.history.retain}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10)
                      setConfigState({
                        ...config,
                        history: { ...config.history, retain: isNaN(v) ? 1 : v }
                      })
                    }}
                    className="w-20 text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:bg-gray-800 dark:text-gray-100"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">entries</span>
                </div>
                {invalidRetain && (
                  <p className="text-xs text-red-600 pl-6" role="alert">
                    Must be at least 1.
                  </p>
                )}
                <StorageSettings
                  saveAudio={config.history.saveAudio}
                  recordingsPath={recordingsPath}
                  onChange={(saveAudio) =>
                    setConfigState({ ...config, history: { ...config.history, saveAudio } })
                  }
                />
              </>
            )}
          </div>
        </section>

        <section aria-labelledby="overlay-heading">
          <h2
            id="overlay-heading"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
          >
            Overlay
          </h2>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={config.overlay.showTimer}
              onChange={(e) => {
                const next = { ...config.overlay, showTimer: e.target.checked }
                setConfigState({ ...config, overlay: next })
                void window.api.previewOverlay({ overlay: next })
              }}
              className="rounded"
            />
            Show elapsed time
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={config.overlay.invertColors}
              onChange={(e) => {
                const next = { ...config.overlay, invertColors: e.target.checked }
                setConfigState({ ...config, overlay: next })
                void window.api.previewOverlay({ overlay: next })
              }}
              className="rounded"
            />
            High contrast
          </label>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              disabled={!config.ui.overlayPosition}
              onClick={async () => {
                await window.api.resetOverlayPosition()
                setConfigState((prev) =>
                  prev ? { ...prev, ui: { ...prev.ui, overlayPosition: undefined } } : prev
                )
                setSavedSnapshot((prev) =>
                  prev
                    ? {
                        ...prev,
                        config: {
                          ...prev.config,
                          ui: { ...prev.config.ui, overlayPosition: undefined }
                        }
                      }
                    : prev
                )
                setPositionReset(true)
                setTimeout(() => setPositionReset(false), 2000)
              }}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 underline underline-offset-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Reset position
            </button>
            {positionReset && (
              <span className="text-sm text-green-600" role="status">
                Position reset
              </span>
            )}
          </div>
        </section>

        <section aria-labelledby="appearance-heading">
          <h2
            id="appearance-heading"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
          >
            Appearance
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400 w-20">Theme</span>
            <select
              value={config.ui.theme}
              onChange={(e) => {
                const theme = e.target.value as 'system' | 'light' | 'dark'
                setConfigState({ ...config, ui: { ...config.ui, theme } })
                onThemeChange?.(theme)
                void window.api.previewOverlay({ theme })
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
          disabled={saving || !isDirty || !!shortcutConflict || !!emptyPrompt || !!invalidRetain}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        {isDirty && !saving && (
          <button
            onClick={handleDiscard}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline underline-offset-2 cursor-pointer"
          >
            Discard changes
          </button>
        )}
        {savedBadge && (
          <span className="text-sm text-green-600" role="status">
            Settings saved
          </span>
        )}
      </footer>
    </div>
  )
}
