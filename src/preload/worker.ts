import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

contextBridge.exposeInMainWorld('workerApi', {
  onStart: (cb: (deviceId?: string) => void) => {
    const handler = (_: IpcRendererEvent, deviceId?: string): void => cb(deviceId)
    ipcRenderer.on('recording:start', handler)
    return () => ipcRenderer.removeListener('recording:start', handler)
  },
  onStop: (cb: () => void) => {
    ipcRenderer.on('recording:stop', cb)
    return () => ipcRenderer.removeListener('recording:stop', cb)
  },
  onCancel: (cb: () => void) => {
    ipcRenderer.on('recording:cancel', cb)
    return () => ipcRenderer.removeListener('recording:cancel', cb)
  },
  sendAudio: (buffer: ArrayBuffer, durationMs: number, micLabel?: string) =>
    ipcRenderer.send('recording:audio', { buffer, durationMs, micLabel }),
  sendError: (message: string) =>
    ipcRenderer.send('recording:error', message)
})
