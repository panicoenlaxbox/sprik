export type OverlayState =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'processing'
  | 'cancelled'
  | 'error'

export const TRANSCRIPTION_PROVIDERS = {
  groq: {
    label: 'Groq',
    models: ['whisper-large-v3-turbo', 'whisper-large-v3'] as const
  },
  openai: {
    label: 'OpenAI',
    models: [
      'gpt-4o-mini-transcribe',
      'gpt-4o-transcribe',
      'gpt-4o-transcribe-diarize',
      'whisper-1'
    ] as const
  },
  azure: {
    label: 'Microsoft Foundry',
    models: [] as readonly string[]
  }
} as const

export interface ModelRef {
  provider: string
  model: string
  endpoint?: string
}

export interface HistoryEntry {
  id: string
  processed: string
  transcript?: string
  path?: string
  timestamp: string
  transcription: ModelRef
  postProcessing?: ModelRef
  postProcessingPrompt?: string
  language?: string
  microphone?: string
  recordingDurationMs?: number
  transcriptionDurationMs?: number
  postProcessingDurationMs?: number
}

export interface Config {
  shortcuts: {
    toggleRecording: string
    cancelRecording: string
  }
  transcription: {
    provider: 'groq' | 'openai' | 'azure'
    model: string
    language?: string
    deviceId?: string
    endpoint?: string
  }
  postProcessing: {
    enabled: boolean
    provider: 'anthropic' | 'openai' | 'azure'
    model: string
    prompt: string
    endpoint?: string
  }
  pasteMode: 'clipboard-and-focus' | 'clipboard-only' | 'focus-only'
  history: {
    retain: number
    enabled: boolean
    saveAudio: boolean
  }
  startup: {
    autostart: boolean
    autoCheck: boolean
    checkIntervalHours: number
  }
  ui: {
    theme: 'system' | 'light' | 'dark'
    sidebarExpanded: boolean
    detailsPanelWidth: number
    overlayPosition?: { x: number; y: number }
  }
  overlay: {
    showTimer: boolean
    invertColors: boolean
  }
}

export type ApiProvider = 'openai' | 'groq' | 'anthropic' | 'azure'
export const API_PROVIDERS: ApiProvider[] = ['anthropic', 'azure', 'groq', 'openai']
export type ApiKeyStatus = Record<ApiProvider, boolean>

export type UpdateStatus =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'up-to-date' }
  | { phase: 'available'; version: string }
  | { phase: 'downloading'; version: string; percent: number }
  | { phase: 'ready'; version: string }
  | { phase: 'error'; message: string }

export interface AppApi {
  onOverlayState: (cb: (state: OverlayState) => void) => () => void
  onLog: (cb: (scope: string, message: string, level: string) => void) => () => void
  getConfig: () => Promise<Config>
  setConfig: (partial: Partial<Config>) => Promise<{ toggleFailed: boolean }>
  getApiKeyStatus: () => Promise<ApiKeyStatus>
  getApiKey: (provider: ApiProvider) => Promise<string>
  setApiKey: (provider: ApiProvider, key: string) => Promise<void>
  clearApiKey: (provider: ApiProvider) => Promise<void>
  getHistory: () => Promise<HistoryEntry[]>
  deleteHistory: (id: string) => Promise<void>
  clearHistory: () => Promise<void>
  exportHistory: () => Promise<string>
  copyToClipboard: (text: string) => Promise<void>
  pauseShortcuts: () => Promise<void>
  resumeShortcuts: () => Promise<void>
  getShortcutStatus: () => Promise<{ toggleRegistered: boolean }>
  getSystemLocale: () => Promise<string>
  openPath: (path: string) => Promise<void>
  openRecordingsPath: () => Promise<void>
  getRecordingsPath: () => Promise<string>
  onThemeChange: (cb: (theme: 'system' | 'light' | 'dark') => void) => () => void
  onHistoryEntryAdded: (cb: (entry: HistoryEntry) => void) => () => void
  cancelRecording: () => Promise<void>
  getAppVersion: () => Promise<string>
  isAutoUpdateSupported: () => boolean
  onUpdateStatus: (cb: (status: UpdateStatus) => void) => () => void
  getUpdateStatus: () => Promise<UpdateStatus>
  checkForUpdates: () => Promise<void>
  installUpdate: () => Promise<void>
  openExternalUrl: (url: string) => Promise<void>
  getRepoUrl: () => Promise<string>
  resetOverlayPosition: () => Promise<void>
  onOverlayPositionChanged: (cb: (pos: { x: number; y: number }) => void) => () => void
  onOverlaySettingsChange: (cb: (overlay: Config['overlay']) => void) => () => void
  previewOverlay: (partial: {
    overlay?: Config['overlay']
    theme?: Config['ui']['theme']
  }) => Promise<void>
}

declare global {
  interface Window {
    api: AppApi
  }
}
