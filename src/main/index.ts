import { app, BrowserWindow, Tray, Menu, nativeImage, shell, session, ipcMain, clipboard, Notification } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { createWorkerWindow, createOverlayWindow, createHistoryWindow } from './windows'
import { registerShortcuts, unregisterShortcuts } from './shortcuts'
import { RecordingOrchestrator, type WorkerBridge, type OverlayBridge, type TranscribePipeline } from './recording'
import { CHANNELS, type OverlayState, type RecordingAudioPayload, setKeyPayloadSchema, apiProviderSchema } from './ipc'
import { getTranscriber } from './transcribers'
import { getPostProcessor } from './llm'
import { copyAndPaste } from './paste'
import { getConfig, setConfig } from './store'
import { getKey, setKey, clearKey, getKeyStatus } from './secrets'
import { appendEntry, getAllEntries, deleteEntry, clearAll, exportEntries } from './history'
import { setAutostart } from './autostart'

let tray: Tray | null = null
let settingsWindow: BrowserWindow | null = null
let historyWindow: BrowserWindow | null = null
let workerWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null
let orchestrator: RecordingOrchestrator | null = null

function createSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return settingsWindow
  }

  settingsWindow = new BrowserWindow({
    width: 600,
    height: 520,
    show: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: 'Murmur — Settings',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  settingsWindow.on('ready-to-show', () => settingsWindow?.show())

  settingsWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    settingsWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/settings/index.html`)
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/settings/index.html'))
  }

  return settingsWindow
}

function createTray(): void {
  const trayIcon = nativeImage.createFromPath(icon)
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }))
  tray.setToolTip('Murmur')

  const menu = Menu.buildFromTemplate([
    { label: 'Settings', click: () => createSettingsWindow() },
    {
      label: 'History',
      click: () => {
        if (historyWindow && !historyWindow.isDestroyed()) {
          historyWindow.focus()
        } else {
          historyWindow = createHistoryWindow()
        }
      }
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ])

  tray.setContextMenu(menu)
  tray.on('click', () => createSettingsWindow())
}

function setupPermissions(): void {
  session.defaultSession.setPermissionRequestHandler((_, permission, callback) => {
    callback(permission === 'media')
  })
  session.defaultSession.setPermissionCheckHandler((_, permission) => {
    return permission === 'media'
  })
}

function buildPipeline(): TranscribePipeline {
  return {
    async run(audioPath: string): Promise<void> {
      const config = getConfig()
      const { provider, model, language } = config.transcription
      const apiKey = getKey(provider) ?? ''
      const transcriber = getTranscriber(provider)
      let text: string
      try {
        text = await transcriber.transcribe(audioPath, { model, language, apiKey })
      } catch (err) {
        new Notification({
          title: 'Murmur — Transcription failed',
          body: err instanceof Error ? err.message : 'Check your API key and connection.'
        }).show()
        throw err
      }

      if (config.postProcess.enabled) {
        const { provider: llmProvider, model: llmModel, systemPrompt } = config.postProcess
        const llmApiKey = getKey(llmProvider) ?? ''
        const processor = getPostProcessor(llmProvider)
        try {
          text = await processor.process(text, { model: llmModel, systemPrompt, apiKey: llmApiKey })
        } catch (err) {
          new Notification({
            title: 'Murmur — Post-processing failed',
            body: err instanceof Error ? err.message : 'Check your LLM API key.'
          }).show()
          throw err
        }
      }

      await copyAndPaste(text, config.paste.autoPaste)

      if (config.history.enabled) {
        appendEntry({ text, provider, model }, config.history.retain)
      }
    }
  }
}

function setupIpcBridges(worker: BrowserWindow, overlay: BrowserWindow): RecordingOrchestrator {
  const workerBridge: WorkerBridge = {
    send: (channel) => worker.webContents.send(channel),
    onAudio: (cb) => {
      ipcMain.on(CHANNELS.RECORDING_AUDIO, (_, payload: { buffer: ArrayBuffer; durationMs: number }) => {
        const typed: RecordingAudioPayload = {
          buffer: Buffer.from(payload.buffer),
          durationMs: payload.durationMs
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
    }
  }

  return new RecordingOrchestrator(workerBridge, overlayBridge, buildPipeline())
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

  ipcMain.handle(CHANNELS.SETTINGS_SET_KEY, (_, payload: unknown) => {
    const { provider, key } = setKeyPayloadSchema.parse(payload)
    setKey(provider, key)
  })

  ipcMain.handle(CHANNELS.SETTINGS_CLEAR_KEY, (_, provider: unknown) => {
    const p = apiProviderSchema.parse(provider)
    clearKey(p)
  })

  ipcMain.handle(CHANNELS.HISTORY_GET_ALL, () => getAllEntries())
  ipcMain.handle(CHANNELS.HISTORY_DELETE, (_, id: string) => deleteEntry(id))
  ipcMain.handle(CHANNELS.HISTORY_CLEAR, () => clearAll())
  ipcMain.handle(CHANNELS.HISTORY_EXPORT, () => exportEntries())
  ipcMain.handle(CHANNELS.CLIPBOARD_WRITE, (_, text: string) => clipboard.writeText(text))
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.murmur.app')

  setupPermissions()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  workerWindow = createWorkerWindow()
  overlayWindow = createOverlayWindow()
  orchestrator = setupIpcBridges(workerWindow, overlayWindow)

  const shortcutHandlers = {
    onToggle: () => orchestrator?.toggle(),
    onCancel: () => orchestrator?.cancel()
  }

  const config = getConfig()
  registerShortcuts(config.shortcuts, shortcutHandlers)
  setAutostart(config.autostart.enabled)

  setupSettingsIpc(shortcutHandlers)

  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().filter((w) => w !== workerWindow && w !== overlayWindow).length === 0) {
      createSettingsWindow()
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
