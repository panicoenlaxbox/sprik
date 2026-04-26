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
  }
} as const

export interface ModelRef {
  provider: string
  model: string
}

export interface HistoryEntry {
  id: string
  processed: string
  transcript?: string
  path?: string
  timestamp: string
  transcription: ModelRef
  postProcessing?: ModelRef
  language?: string
  microphone?: string
}

export interface Config {
  shortcuts: {
    toggleRecording: string
    cancelRecording: string
  }
  transcription: {
    provider: 'groq' | 'openai'
    model: string
    language?: string
    deviceId?: string
  }
  postProcessing: {
    enabled: boolean
    provider: 'anthropic' | 'openai'
    model: string
    prompt: string
  }
  paste: {
    autoPaste: boolean
  }
  history: {
    retain: number
    enabled: boolean
  }
  autostart: {
    enabled: boolean
  }
  ui: {
    theme: 'system' | 'light' | 'dark'
  }
  recordings: {
    saveText: boolean
    saveAudio: boolean
  }
}

export type ApiProvider = 'openai' | 'groq' | 'anthropic'
export type ApiKeyStatus = Record<ApiProvider, boolean>

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
}

declare global {
  interface Window {
    api: AppApi
  }
}
