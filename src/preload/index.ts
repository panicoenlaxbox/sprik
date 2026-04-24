import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer — expanded per milestone
const api = {}

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
