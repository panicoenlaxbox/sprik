import { app, BrowserWindow, Tray, Menu, nativeImage, session, ipcMain, clipboard, Notification, shell } from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { createWorkerWindow, createOverlayWindow, createAppWindow } from './windows'
import { registerShortcuts, registerCancelShortcut, unregisterCancelShortcut, unregisterShortcuts } from './shortcuts'
import { RecordingOrchestrator, type WorkerBridge, type OverlayBridge, type TranscribePipeline } from './recording'
import { CHANNELS, type OverlayState, type RecordingAudioPayload, setKeyPayloadSchema, apiProviderSchema } from './ipc'
import { getTranscriber } from './transcribers'
import { getPostProcessor } from './llm'
import { copyAndPaste } from './paste'
import { getConfig, setConfig } from './store'
import { copyFileSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { getKey, setKey, clearKey, getKeyStatus } from './secrets'
import { appendEntry, getEntries, deleteEntry, clearEntries, exportEntries } from './history'
import { setAutostart } from './autostart'
import { setLogRenderer, log } from './logger'

let tray: Tray | null = null
let appWindow: BrowserWindow | null = null
let workerWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null
let orchestrator: RecordingOrchestrator | null = null

function openAppWindow(): BrowserWindow {
  if (appWindow && !appWindow.isDestroyed()) {
    appWindow.focus()
    return appWindow
  }
  appWindow = createAppWindow()
  appWindow.on('ready-to-show', () => {
    setLogRenderer(appWindow!.webContents)
    if (is.dev) {
      appWindow!.webContents.on('before-input-event', (_, input) => {
        if (input.key === 'F12' && input.type === 'keyDown') {
          appWindow!.webContents.toggleDevTools()
        }
      })
    }
  })
  appWindow.on('closed', () => { appWindow = null })
  return appWindow
}

function createTray(): void {
  const trayIcon = nativeImage.createFromPath(icon)
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }))
  tray.setToolTip('Murmur')

  const menu = Menu.buildFromTemplate([
    { label: 'Open', click: () => openAppWindow() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ])

  tray.setContextMenu(menu)
  tray.on('click', () => openAppWindow())
}

function setupPermissions(): void {
  session.defaultSession.setPermissionRequestHandler((_, permission, callback) => {
    callback(permission === 'media')
  })
  session.defaultSession.setPermissionCheckHandler((_, permission) => {
    return permission === 'media'
  })
}

function buildPipeline(setOverlayState: (s: OverlayState) => void): TranscribePipeline {
  return {
    async run(audioPath: string, microphone?: string): Promise<void> {
      const config = getConfig()
      const { provider, model, language } = config.transcription
      const transcriptionApiKey = getKey(provider) ?? ''
      const transcriber = getTranscriber(provider)
      let transcript: string
      try {
        transcript = await transcriber.transcribe(audioPath, { model, language, apiKey: transcriptionApiKey })
      } catch (err) {
        log('transcription', err instanceof Error ? err.message : String(err), 'error')
        new Notification({ title: 'Murmur — Transcription failed', body: 'Check your API key and connection.' }).show()
        throw err
      }

      let text = transcript
      if (config.postProcess.enabled) {
        setOverlayState('processing')
        const postProcessingApiKey = getKey(config.postProcess.provider) ?? ''
        const processor = getPostProcessor(config.postProcess.provider)
        try {
          text = await processor.process(transcript, {
            model: config.postProcess.model,
            systemPrompt: config.postProcess.systemPrompt,
            apiKey: postProcessingApiKey
          })
        } catch (err) {
          log('postProcessing', err instanceof Error ? err.message : String(err), 'error')
          new Notification({ title: 'Murmur — Post-processing failed', body: 'Check your API key and connection.' }).show()
          throw err
        }
      }

      await copyAndPaste(text, config.paste.autoPaste)

      let path: string | undefined
      if (config.recordings.saveText || config.recordings.saveAudio) {
        const sessionDir = join(app.getPath('userData'), 'recordings', `${Date.now()}`)
        mkdirSync(sessionDir, { recursive: true })
        if (config.recordings.saveAudio) {
          copyFileSync(audioPath, join(sessionDir, 'audio.webm'))
        }
        if (config.recordings.saveText) {
          writeFileSync(join(sessionDir, 'transcript.txt'), transcript, 'utf8')
          if (config.postProcess.enabled) {
            writeFileSync(join(sessionDir, 'processed.txt'), text, 'utf8')
          }
        }
        path = sessionDir
      }

      if (config.history.enabled) {
        appendEntry({
          processed: text,
          transcript: config.postProcess.enabled ? transcript : undefined,
          path,
          transcription: { provider, model },
          postProcessing: config.postProcess.enabled
            ? { provider: config.postProcess.provider, model: config.postProcess.model }
            : undefined,
          language: language || undefined,
          microphone
        }, config.history.retain)
      }
    }
  }
}

function setupIpcBridges(worker: BrowserWindow, overlay: BrowserWindow, onIdle: () => void): RecordingOrchestrator {
  const workerBridge: WorkerBridge = {
    send: (channel, payload) => worker.webContents.send(channel, payload),
    onAudio: (cb) => {
      ipcMain.on(CHANNELS.RECORDING_AUDIO, (_, payload: { buffer: ArrayBuffer; durationMs: number; microphone?: string }) => {
        const typed: RecordingAudioPayload = {
          buffer: Buffer.from(payload.buffer),
          durationMs: payload.durationMs,
          microphone: payload.microphone
        }
        cb(typed)
      })
    },
    onError: (cb) => {
      ipcMain.on(CHANNELS.RECORDING_ERROR, (_, message: string) => cb(message))
    }
  }

  const overlayBridge: OverlayBridge = {
    setState: (state: OverlayState) => {
      overlay.webContents.send(CHANNELS.OVERLAY_STATE, state)
      overlay.setIgnoreMouseEvents(state === 'idle', { forward: true })
      log('overlay', `state = ${state}`)
    }
  }

  return new RecordingOrchestrator(workerBridge, overlayBridge, buildPipeline(overlayBridge.setState.bind(overlayBridge)), onIdle)
}

function setupSettingsIpc(shortcutHandlers: { onToggle: () => void; onCancel: () => void }): void {
  ipcMain.handle(CHANNELS.SETTINGS_GET, () => getConfig())

  ipcMain.handle(CHANNELS.SETTINGS_SET, (_, partial: unknown) => {
    const prevConfig = getConfig()
    setConfig(partial as Parameters<typeof setConfig>[0])
    const newConfig = getConfig()
    if (
      prevConfig.shortcuts.toggleRecording !== newConfig.shortcuts.toggleRecording ||
      prevConfig.shortcuts.cancelRecording !== newConfig.shortcuts.cancelRecording
    ) {
      unregisterShortcuts()
      registerShortcuts(newConfig.shortcuts, shortcutHandlers)
    }
    if (prevConfig.autostart.enabled !== newConfig.autostart.enabled) {
      setAutostart(newConfig.autostart.enabled)
    }
  })

  ipcMain.handle(CHANNELS.SETTINGS_GET_KEY_STATUS, () => getKeyStatus())

  ipcMain.handle(CHANNELS.SETTINGS_GET_KEY, (_, provider: unknown) => {
    const p = apiProviderSchema.parse(provider)
    return getKey(p) ?? ''
  })

  ipcMain.handle(CHANNELS.SETTINGS_SET_KEY, (_, payload: unknown) => {
    const { provider, key } = setKeyPayloadSchema.parse(payload)
    setKey(provider, key)
  })

  ipcMain.handle(CHANNELS.SETTINGS_CLEAR_KEY, (_, provider: unknown) => {
    const p = apiProviderSchema.parse(provider)
    clearKey(p)
  })

  ipcMain.handle(CHANNELS.HISTORY_GET_ALL, () => getEntries())
  ipcMain.handle(CHANNELS.HISTORY_DELETE, (_, id: string) => deleteEntry(id))
  ipcMain.handle(CHANNELS.HISTORY_CLEAR, () => clearEntries()())
  ipcMain.handle(CHANNELS.HISTORY_EXPORT, () => exportEntries())
  ipcMain.handle(CHANNELS.CLIPBOARD_WRITE, (_, text: string) => clipboard.writeText(text))

  ipcMain.handle(CHANNELS.SHORTCUTS_PAUSE, () => unregisterShortcuts())
  ipcMain.handle(CHANNELS.SHORTCUTS_RESUME, () =>
    registerShortcuts(getConfig().shortcuts, shortcutHandlers)
  )

  ipcMain.handle(CHANNELS.SHELL_OPEN_PATH, (_, path: string) => shell.openPath(path))

  ipcMain.handle(CHANNELS.RECORDINGS_GET_PATH, () => app.getPath('userData'))

  ipcMain.handle(CHANNELS.SHELL_OPEN_RECORDINGS_PATH, () =>
    shell.openPath(app.getPath('userData'))
  )
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.murmur.app')

  setupPermissions()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  workerWindow = createWorkerWindow()
  overlayWindow = createOverlayWindow(getConfig().ui.overlayPosition)
  overlayWindow.on('moved', () => {
    const [x, y] = overlayWindow!.getPosition()
    const cfg = getConfig()
    setConfig({ ui: { ...cfg.ui, overlayPosition: { x, y } } })
  })

  const shortcutHandlers = {
    onToggle: () => {
      if (orchestrator?.getState() === 'idle') {
        const cfg = getConfig()
        const key = getKey(cfg.transcription.provider)
        if (!key) {
          const n = new Notification({
            title: 'Murmur — No API key',
            body: 'Set an API key in Settings before recording.'
          })
          n.on('click', () => openAppWindow())
          n.show()
          return
        }
        registerCancelShortcut(cfg.shortcuts.cancelRecording, shortcutHandlers.onCancel)
      }
      orchestrator?.toggle(getConfig().transcription.deviceId)
    },
    onCancel: () => {
      unregisterCancelShortcut(getConfig().shortcuts.cancelRecording)
      orchestrator?.cancel()
    }
  }

  orchestrator = setupIpcBridges(workerWindow, overlayWindow, () => {
    unregisterCancelShortcut(getConfig().shortcuts.cancelRecording)
  })

  const config = getConfig()
  registerShortcuts(config.shortcuts, shortcutHandlers)
  setAutostart(config.autostart.enabled)

  setupSettingsIpc(shortcutHandlers)

  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().filter((w) => w !== workerWindow && w !== overlayWindow).length === 0) {
      openAppWindow()
    }
  })

  app.on('will-quit', () => {
    orchestrator?.deleteTempFile()
    unregisterShortcuts()
  })
})

// Keep app alive in tray when all visible windows are closed
app.on('window-all-closed', () => {
  // Intentionally empty — app lives in the tray
})
