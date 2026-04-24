import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('workerApi', {
  onStart: (cb: () => void) => {
    ipcRenderer.on('recording:start', cb)
    return () => ipcRenderer.removeListener('recording:start', cb)
  },
  onStop: (cb: () => void) => {
    ipcRenderer.on('recording:stop', cb)
    return () => ipcRenderer.removeListener('recording:stop', cb)
  },
  onCancel: (cb: () => void) => {
    ipcRenderer.on('recording:cancel', cb)
    return () => ipcRenderer.removeListener('recording:cancel', cb)
  },
  sendAudio: (buffer: ArrayBuffer, durationMs: number) =>
    ipcRenderer.send('recording:audio', { buffer, durationMs }),
  sendError: (message: string) =>
    ipcRenderer.send('recording:error', message)
})
