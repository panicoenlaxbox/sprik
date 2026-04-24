import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  onOverlayState: (cb: (state: string) => void): (() => void) => {
    const handler = (_: IpcRendererEvent, state: string): void => cb(state)
    ipcRenderer.on('overlay:state', handler)
    return () => ipcRenderer.removeListener('overlay:state', handler)
  }
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
