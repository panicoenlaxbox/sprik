import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { CHANNELS } from '../shared/channels'
import type {
  Config,
  ApiProvider,
  OverlayState,
  HistoryEntry,
  UpdateStatus
} from '../renderer/shared/types'

const api = {
  onOverlayState: (cb: (state: OverlayState) => void): (() => void) => {
    const handler = (_: IpcRendererEvent, state: OverlayState): void => cb(state)
    ipcRenderer.on(CHANNELS.OVERLAY_STATE, handler)
    return () => ipcRenderer.removeListener(CHANNELS.OVERLAY_STATE, handler)
  },

  onLog: (cb: (scope: string, message: string, level: string) => void): (() => void) => {
    const handler = (_: IpcRendererEvent, scope: string, message: string, level: string): void =>
      cb(scope, message, level)
    ipcRenderer.on(CHANNELS.LOG_FORWARD, handler)
    return () => ipcRenderer.removeListener(CHANNELS.LOG_FORWARD, handler)
  },

  getConfig: (): Promise<Config> => ipcRenderer.invoke(CHANNELS.SETTINGS_GET),

  setConfig: (partial: Partial<Config>): Promise<{ toggleFailed: boolean }> =>
    ipcRenderer.invoke(CHANNELS.SETTINGS_SET, partial),

  getApiKeyStatus: (): Promise<Record<ApiProvider, boolean>> =>
    ipcRenderer.invoke(CHANNELS.SETTINGS_GET_KEY_STATUS),

  getApiKey: (provider: ApiProvider): Promise<string> =>
    ipcRenderer.invoke(CHANNELS.SETTINGS_GET_KEY, provider),

  setApiKey: (provider: ApiProvider, key: string): Promise<void> =>
    ipcRenderer.invoke(CHANNELS.SETTINGS_SET_KEY, { provider, key }),

  clearApiKey: (provider: ApiProvider): Promise<void> =>
    ipcRenderer.invoke(CHANNELS.SETTINGS_CLEAR_KEY, provider),

  getHistory: (): Promise<HistoryEntry[]> => ipcRenderer.invoke(CHANNELS.HISTORY_GET_ALL),

  deleteHistory: (id: string): Promise<void> => ipcRenderer.invoke(CHANNELS.HISTORY_DELETE, id),

  clearHistory: (): Promise<void> => ipcRenderer.invoke(CHANNELS.HISTORY_CLEAR),

  exportHistory: (): Promise<string> => ipcRenderer.invoke(CHANNELS.HISTORY_EXPORT),

  copyToClipboard: (text: string): Promise<void> =>
    ipcRenderer.invoke(CHANNELS.CLIPBOARD_WRITE, text),

  pauseShortcuts: (): Promise<void> => ipcRenderer.invoke(CHANNELS.SHORTCUTS_PAUSE),

  resumeShortcuts: (): Promise<void> => ipcRenderer.invoke(CHANNELS.SHORTCUTS_RESUME),

  getShortcutStatus: (): Promise<{ toggleRegistered: boolean }> =>
    ipcRenderer.invoke(CHANNELS.SHORTCUTS_GET_STATUS),

  getSystemLocale: (): Promise<string> => ipcRenderer.invoke(CHANNELS.SYSTEM_GET_LOCALE),

  openPath: (path: string): Promise<void> => ipcRenderer.invoke(CHANNELS.SHELL_OPEN_PATH, path),

  openRecordingsPath: (): Promise<void> => ipcRenderer.invoke(CHANNELS.SHELL_OPEN_RECORDINGS_PATH),

  getRecordingsPath: (): Promise<string> => ipcRenderer.invoke(CHANNELS.RECORDINGS_GET_PATH),

  onThemeChange: (cb: (theme: 'system' | 'light' | 'dark') => void): (() => void) => {
    const handler = (_: IpcRendererEvent, theme: 'system' | 'light' | 'dark'): void => cb(theme)
    ipcRenderer.on(CHANNELS.UI_THEME_CHANGED, handler)
    return () => ipcRenderer.removeListener(CHANNELS.UI_THEME_CHANGED, handler)
  },

  onHistoryEntryAdded: (cb: (entry: HistoryEntry) => void): (() => void) => {
    const handler = (_: IpcRendererEvent, entry: HistoryEntry): void => cb(entry)
    ipcRenderer.on(CHANNELS.HISTORY_ENTRY_ADDED, handler)
    return () => ipcRenderer.removeListener(CHANNELS.HISTORY_ENTRY_ADDED, handler)
  },

  cancelRecording: (): Promise<void> => ipcRenderer.invoke(CHANNELS.RECORDING_CANCEL),

  getAppVersion: (): Promise<string> => ipcRenderer.invoke(CHANNELS.UPDATE_GET_VERSION),

  isAutoUpdateSupported: (): boolean => process.platform === 'win32',

  onUpdateStatus: (cb: (status: UpdateStatus) => void): (() => void) => {
    const handler = (_: IpcRendererEvent, status: UpdateStatus): void => cb(status)
    ipcRenderer.on(CHANNELS.UPDATE_STATUS, handler)
    return () => ipcRenderer.removeListener(CHANNELS.UPDATE_STATUS, handler)
  },

  checkForUpdates: (): Promise<void> => ipcRenderer.invoke(CHANNELS.UPDATE_CHECK),

  installUpdate: (): Promise<void> => ipcRenderer.invoke(CHANNELS.UPDATE_INSTALL),

  openExternalUrl: (url: string): Promise<void> =>
    ipcRenderer.invoke(CHANNELS.SHELL_OPEN_EXTERNAL, url),

  getRepoUrl: (): Promise<string> => ipcRenderer.invoke(CHANNELS.APP_GET_REPO_URL),

  resetOverlayPosition: (): Promise<void> => ipcRenderer.invoke(CHANNELS.OVERLAY_RESET_POSITION),

  onOverlayPositionChanged: (cb: (pos: { x: number; y: number }) => void): (() => void) => {
    const handler = (_: IpcRendererEvent, pos: { x: number; y: number }): void => cb(pos)
    ipcRenderer.on(CHANNELS.OVERLAY_POSITION_CHANGED, handler)
    return () => ipcRenderer.removeListener(CHANNELS.OVERLAY_POSITION_CHANGED, handler)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore contextIsolation is false in dev/test — window.api is not typed on Window
  window.api = api
}

export type AppApi = typeof api
