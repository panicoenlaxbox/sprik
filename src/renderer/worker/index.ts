// Makes this file a module so `declare global` is valid
export {}

declare global {
  interface Window {
    workerApi: {
      onStart: (cb: (deviceId?: string) => void) => () => void
      onStop: (cb: () => void) => () => void
      onCancel: (cb: () => void) => () => void
      sendAudio: (buffer: ArrayBuffer, durationMs: number, microphone?: string) => void
      sendError: (message: string) => void
      sendStarted: () => void
      sendAborted: () => void
      log: (scope: string, message: string, level: string) => void
    }
  }
}

import { USB_DEVICE_ID_RE } from '../../shared/utils'
import { SCOPES } from '../../shared/scopes'

let mediaRecorder: MediaRecorder | null = null
let chunks: Blob[] = []
let startedAt = 0

// Incremented on every start/stop/cancel. `getUserMedia` can take many seconds
// when the audio device is cold, so a stop or cancel may arrive while it is
// still pending. The session id lets the resolved stream detect that it is
// stale, release the device and report back instead of starting a recording
// nobody is waiting for.
let session = 0

async function startRecording(deviceId?: string): Promise<void> {
  window.workerApi.log(SCOPES.worker, 'startRecording called', 'info')
  chunks = []
  session += 1
  const mySession = session
  try {
    const constraint = deviceId ? { audio: { deviceId: { exact: deviceId } } } : { audio: true }
    const stream = await navigator.mediaDevices.getUserMedia(constraint)
    window.workerApi.log(SCOPES.worker, 'got mic stream', 'info')

    if (mySession !== session) {
      stream.getTracks().forEach((t) => t.stop())
      window.workerApi.log(SCOPES.worker, 'mic stream arrived after stop; discarded', 'warn')
      window.workerApi.sendAborted()
      return
    }

    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })

    mediaRecorder.ondataavailable = (e): void => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    mediaRecorder.onstop = async (): Promise<void> => {
      const durationMs = Date.now() - startedAt
      const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' })
      const buffer = await blob.arrayBuffer()
      const microphone =
        stream.getAudioTracks()[0]?.label.replace(USB_DEVICE_ID_RE, '') || undefined
      window.workerApi.sendAudio(buffer, durationMs, microphone)
      stream.getTracks().forEach((t) => t.stop())
    }

    startedAt = Date.now()
    mediaRecorder.start(250)
    window.workerApi.log(SCOPES.worker, 'mediaRecorder started', 'info')
    window.workerApi.sendStarted()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    window.workerApi.log(SCOPES.worker, `getUserMedia error: ${message}`, 'error')
    window.workerApi.sendError(message)
  }
}

function stopRecording(): void {
  session += 1
  if (mediaRecorder?.state === 'recording') {
    mediaRecorder.stop()
  }
}

function cancelRecording(): void {
  session += 1
  if (mediaRecorder?.state === 'recording') {
    mediaRecorder.ondataavailable = null
    mediaRecorder.onstop = null
    mediaRecorder.stop()
    mediaRecorder.stream.getTracks().forEach((t) => t.stop())
  }
  chunks = []
  mediaRecorder = null
}

window.workerApi.onStart(startRecording)
window.workerApi.onStop(stopRecording)
window.workerApi.onCancel(cancelRecording)
