export type OverlayState = 'idle' | 'recording' | 'transcribing' | 'cancelled'

export const TRANSCRIPTION_PROVIDERS = {
  groq: {
    label: 'Groq',
    models: ['distil-whisper-large-v3-en', 'whisper-large-v3', 'whisper-large-v3-turbo'] as const
  },
  openai: {
    label: 'OpenAI',
    models: ['gpt-4o-mini-transcribe', 'gpt-4o-transcribe', 'whisper-1'] as const
  }
} as const

export interface HistoryEntry {
  id: string
  text: string
  transcript?: string
  recordingFolder?: string
  timestamp: string
  provider: string
  model: string
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
  postProcess: {
    enabled: boolean
    provider: 'anthropic' | 'openai'
    model: string
    systemPrompt: string
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
  onLog: (cb: (scope: string, message: string) => void) => () => void
  getConfig: () => Promise<Config>
  setConfig: (partial: Partial<Config>) => Promise<void>
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
  openPath: (path: string) => Promise<void>
  openRecordingsFolder: () => Promise<void>
  getRecordingsPath: () => Promise<string>
}

declare global {
  interface Window {
    api: AppApi
  }
}
