import { app, BrowserWindow, Tray, Menu, nativeImage, shell, session, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { createWorkerWindow, createOverlayWindow } from './windows'
import { registerShortcuts, unregisterShortcuts } from './shortcuts'
import { RecordingOrchestrator, type WorkerBridge, type OverlayBridge, type TranscribePipeline } from './recording'
import { CHANNELS, type OverlayState, type RecordingAudioPayload } from './ipc'
import { openaiTranscriber } from './transcribers/openai'
import { copyAndPaste } from './paste'

let tray: Tray | null = null
let settingsWindow: BrowserWindow | null = null
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

  const pipeline: TranscribePipeline = {
    async run(audioPath: string): Promise<void> {
      const apiKey = process.env['OPENAI_API_KEY'] ?? ''
      const text = await openaiTranscriber.transcribe(audioPath, {
        model: 'gpt-4o-mini-transcribe',
        apiKey
      })
      await copyAndPaste(text)
    }
  }

  return new RecordingOrchestrator(workerBridge, overlayBridge, pipeline)
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

  registerShortcuts(
    { toggleRecording: 'Ctrl+Alt+Space', cancelRecording: 'Escape' },
    {
      onToggle: () => orchestrator?.toggle(),
      onCancel: () => orchestrator?.cancel()
    }
  )

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
