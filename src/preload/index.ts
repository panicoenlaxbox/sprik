import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { CHANNELS } from '../main/ipc'
import type { Config, ApiProvider, OverlayState } from '../renderer/shared/types'

const api = {
  onOverlayState: (cb: (state: OverlayState) => void): (() => void) => {
    const handler = (_: IpcRendererEvent, state: OverlayState): void => cb(state)
    ipcRenderer.on(CHANNELS.OVERLAY_STATE, handler)
    return () => ipcRenderer.removeListener(CHANNELS.OVERLAY_STATE, handler)
  },

  getConfig: (): Promise<Config> =>
    ipcRenderer.invoke(CHANNELS.SETTINGS_GET),

  setConfig: (partial: Partial<Config>): Promise<void> =>
    ipcRenderer.invoke(CHANNELS.SETTINGS_SET, partial),

  getApiKeyStatus: (): Promise<Record<ApiProvider, boolean>> =>
    ipcRenderer.invoke(CHANNELS.SETTINGS_GET_KEY_STATUS),

  setApiKey: (provider: ApiProvider, key: string): Promise<void> =>
    ipcRenderer.invoke(CHANNELS.SETTINGS_SET_KEY, { provider, key }),

  clearApiKey: (provider: ApiProvider): Promise<void> =>
    ipcRenderer.invoke(CHANNELS.SETTINGS_CLEAR_KEY, provider)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (defined in preload/index.d.ts)
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}

export type AppApi = typeof api
