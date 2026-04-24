// Makes this file a module so `declare global` is valid
export {}

declare global {
  interface Window {
    workerApi: {
      onStart: (cb: (deviceId?: string) => void) => () => void
      onStop: (cb: () => void) => () => void
      onCancel: (cb: () => void) => () => void
      sendAudio: (buffer: ArrayBuffer, durationMs: number) => void
      sendError: (message: string) => void
    }
  }
}

let mediaRecorder: MediaRecorder | null = null
let chunks: Blob[] = []
let startedAt = 0

async function startRecording(deviceId?: string): Promise<void> {
  console.log('[worker] startRecording called')
  chunks = []
  try {
    const constraint = deviceId ? { audio: { deviceId: { exact: deviceId } } } : { audio: true }
    const stream = await navigator.mediaDevices.getUserMedia(constraint)
    console.log('[worker] got mic stream')
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })

    mediaRecorder.ondataavailable = (e): void => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    mediaRecorder.onstop = async (): Promise<void> => {
      const durationMs = Date.now() - startedAt
      const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' })
      const buffer = await blob.arrayBuffer()
      window.workerApi.sendAudio(buffer, durationMs)
      stream.getTracks().forEach((t) => t.stop())
    }

    startedAt = Date.now()
    mediaRecorder.start(250)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[worker] getUserMedia error:', message)
    window.workerApi.sendError(message)
  }
}

function stopRecording(): void {
  if (mediaRecorder?.state === 'recording') {
    mediaRecorder.stop()
  }
}

function cancelRecording(): void {
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
