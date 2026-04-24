export type OverlayState = 'idle' | 'recording' | 'transcribing'

export interface HistoryEntry {
  id: string
  text: string
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
}

export type ApiProvider = 'openai' | 'groq' | 'anthropic'
export type ApiKeyStatus = Record<ApiProvider, boolean>

export interface AppApi {
  onOverlayState: (cb: (state: OverlayState) => void) => () => void
  getConfig: () => Promise<Config>
  setConfig: (partial: Partial<Config>) => Promise<void>
  getApiKeyStatus: () => Promise<ApiKeyStatus>
  setApiKey: (provider: ApiProvider, key: string) => Promise<void>
  clearApiKey: (provider: ApiProvider) => Promise<void>
  getHistory: () => Promise<HistoryEntry[]>
  deleteHistory: (id: string) => Promise<void>
  clearHistory: () => Promise<void>
  exportHistory: () => Promise<string>
  copyToClipboard: (text: string) => Promise<void>
}

declare global {
  interface Window {
    api: AppApi
  }
}
