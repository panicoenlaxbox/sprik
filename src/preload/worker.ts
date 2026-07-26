import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { WORKER_CHANNELS } from '../shared/worker-channels'

contextBridge.exposeInMainWorld('workerApi', {
  onStart: (cb: (deviceId?: string) => void) => {
    const handler = (_: IpcRendererEvent, deviceId?: string): void => cb(deviceId)
    ipcRenderer.on(WORKER_CHANNELS.RECORDING_START, handler)
    return () => ipcRenderer.removeListener(WORKER_CHANNELS.RECORDING_START, handler)
  },
  onStop: (cb: () => void) => {
    ipcRenderer.on(WORKER_CHANNELS.RECORDING_STOP, cb)
    return () => ipcRenderer.removeListener(WORKER_CHANNELS.RECORDING_STOP, cb)
  },
  onCancel: (cb: () => void) => {
    ipcRenderer.on(WORKER_CHANNELS.RECORDING_CANCEL, cb)
    return () => ipcRenderer.removeListener(WORKER_CHANNELS.RECORDING_CANCEL, cb)
  },
  sendAudio: (buffer: ArrayBuffer, durationMs: number, microphone?: string) =>
    ipcRenderer.send(WORKER_CHANNELS.RECORDING_AUDIO, { buffer, durationMs, microphone }),
  sendError: (message: string) => ipcRenderer.send(WORKER_CHANNELS.RECORDING_ERROR, message),
  sendStarted: () => ipcRenderer.send(WORKER_CHANNELS.RECORDING_STARTED),
  sendAborted: () => ipcRenderer.send(WORKER_CHANNELS.RECORDING_ABORTED),
  log: (scope: string, message: string, level: string) =>
    ipcRenderer.send(WORKER_CHANNELS.LOG_WORKER, scope, message, level)
})
