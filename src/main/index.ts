import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  session,
  ipcMain,
  clipboard,
  Notification,
  shell,
  systemPreferences,
  dialog
} from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { repository } from '../../package.json'
import icon from '../../resources/icon.png?asset'
import {
  createWorkerWindow,
  createOverlayWindow,
  createAppWindow,
  defaultOverlayPosition
} from './windows'
import {
  registerShortcuts,
  registerCancelShortcut,
  unregisterCancelShortcut,
  unregisterShortcuts,
  isShortcutRegistered
} from './shortcuts'
import {
  RecordingOrchestrator,
  type WorkerBridge,
  type OverlayBridge,
  type TranscribePipeline
} from './recording'
import {
  CHANNELS,
  type OverlayState,
  type RecordingAudioPayload,
  setKeyPayloadSchema,
  apiProviderSchema
} from './ipc'
import { getTranscriber } from './transcribers'
import { getPostProcessor } from './llm'
import { copyAndPaste } from './paste'
import { getConfig, setConfig } from './store'
import { copyFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { getKey, setKey, clearKey, getKeyStatus } from './secrets'
import { appendEntry, getEntries, deleteEntry, clearEntries, exportEntries } from './history'
import { setAutostart } from './autostart'
import { setLogRenderer, log } from './logger'
import pkg from 'electron-updater'

const { autoUpdater } = pkg
import { initUpdater, getLatestUpdateStatus } from './updater'

let tray: Tray | null = null
let appWindow: BrowserWindow | null = null
let quitting = false
let workerWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null
let orchestrator: RecordingOrchestrator | null = null

function getSystemLanguage(): string {
  return app.getLocale().split('-')[0]
}

function openAppWindow(): BrowserWindow {
  if (appWindow && !appWindow.isDestroyed()) {
    appWindow.focus()
    return appWindow
  }
  appWindow = createAppWindow()
  appWindow.webContents.on('will-prevent-unload', (event) => {
    if (quitting) {
      event.preventDefault()
      return
    }
    const choice = dialog.showMessageBoxSync(appWindow!, {
      type: 'question',
      buttons: ['Discard changes', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      title: 'Unsaved changes',
      message: 'Settings have not been saved.',
      detail: 'Close without saving?'
    })
    if (choice === 0) event.preventDefault()
  })

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
  appWindow.on('closed', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      const cfg = getConfig()
      overlayWindow.webContents.send(CHANNELS.OVERLAY_SETTINGS_CHANGED, cfg.overlay)
      overlayWindow.webContents.send(CHANNELS.UI_THEME_CHANGED, cfg.ui.theme)
    }
    appWindow = null
  })
  return appWindow
}

function createTray(): void {
  const trayIcon = nativeImage.createFromPath(icon)
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }))
  tray.setToolTip('Sprik')

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
    async run(
      audioPath: string,
      durationMs?: number,
      microphone?: string,
      signal?: AbortSignal
    ): Promise<void> {
      const config = getConfig()
      const { provider, model, language, endpoint } = config.transcription
      const resolvedLanguage = language ?? getSystemLanguage()
      const transcriptionApiKey = getKey(provider) ?? ''
      const transcriber = getTranscriber(provider)
      let transcript: string
      let transcriptionDurationMs: number
      try {
        const t0 = Date.now()
        transcript = await transcriber.transcribe(audioPath, {
          model,
          language: resolvedLanguage,
          apiKey: transcriptionApiKey,
          endpoint
        })
        transcriptionDurationMs = Date.now() - t0
      } catch (err) {
        log('transcription', err instanceof Error ? err.message : String(err), 'error')
        new Notification({
          title: 'Sprik — Could not process transcript',
          body: 'API key or connection issue.'
        }).show()
        throw err
      }

      if (!transcript) {
        log('transcription', 'empty transcript returned', 'warn')
        new Notification({
          title: 'Sprik — Transcription failed',
          body: 'No speech detected or API returned an empty result.'
        }).show()
        throw new Error('empty transcript')
      }

      if (signal?.aborted) return

      let text = transcript
      let postProcessingDurationMs: number | undefined
      if (config.postProcessing.enabled) {
        setOverlayState('processing')
        const postProcessingApiKey = getKey(config.postProcessing.provider) ?? ''
        const processor = getPostProcessor(config.postProcessing.provider)
        try {
          const t0 = Date.now()
          text = await processor.process(transcript, {
            model: config.postProcessing.model,
            prompt: config.postProcessing.prompt,
            apiKey: postProcessingApiKey,
            endpoint: config.postProcessing.endpoint
          })
          postProcessingDurationMs = Date.now() - t0
        } catch (err) {
          log('postProcessing', err instanceof Error ? err.message : String(err), 'error')
          new Notification({
            title: 'Sprik — Could not process transcript',
            body: 'API key or connection issue.'
          }).show()
          throw err
        }

        if (!text) {
          log('postProcessing', 'empty result returned', 'warn')
          new Notification({
            title: 'Sprik — Post-processing failed',
            body: 'API returned an empty result.'
          }).show()
          throw new Error('empty post-processing result')
        }

        if (signal?.aborted) return
      }

      await copyAndPaste(text, config.pasteMode)

      let path: string | undefined
      if (config.history.saveAudio) {
        const sessionDir = join(app.getPath('userData'), 'recordings', `${Date.now()}`)
        mkdirSync(sessionDir, { recursive: true })
        copyFileSync(audioPath, join(sessionDir, 'audio.webm'))
        path = sessionDir
      }

      if (config.history.enabled) {
        const newEntry = appendEntry(
          {
            processed: text,
            transcript: config.postProcessing.enabled ? transcript : undefined,
            path,
            transcription: {
              provider,
              model,
              endpoint: provider === 'azure' ? endpoint : undefined
            },
            postProcessing: config.postProcessing.enabled
              ? {
                  provider: config.postProcessing.provider,
                  model: config.postProcessing.model,
                  endpoint:
                    config.postProcessing.provider === 'azure'
                      ? config.postProcessing.endpoint
                      : undefined
                }
              : undefined,
            postProcessingPrompt: config.postProcessing.enabled
              ? config.postProcessing.prompt
              : undefined,
            language: resolvedLanguage,
            microphone,
            recordingDurationMs: durationMs,
            transcriptionDurationMs,
            postProcessingDurationMs
          },
          config.history.retain
        )
        appWindow?.webContents.send(CHANNELS.HISTORY_ENTRY_ADDED, newEntry)
      }
    }
  }
}

function setupIpcBridges(
  worker: BrowserWindow,
  overlay: BrowserWindow,
  onIdle: () => void
): RecordingOrchestrator {
  const workerBridge: WorkerBridge = {
    send: (channel, payload) => worker.webContents.send(channel, payload),
    onAudio: (cb) => {
      ipcMain.on(
        CHANNELS.RECORDING_AUDIO,
        (_, payload: { buffer: ArrayBuffer; durationMs: number; microphone?: string }) => {
          const typed: RecordingAudioPayload = {
            buffer: Buffer.from(payload.buffer),
            durationMs: payload.durationMs,
            microphone: payload.microphone
          }
          cb(typed)
        }
      )
    },
    onError: (cb) => {
      ipcMain.on(CHANNELS.RECORDING_ERROR, (_, message: string) => cb(message))
    }
  }

  const overlayBridge: OverlayBridge = {
    setState: (state: OverlayState) => {
      overlay.webContents.send(CHANNELS.OVERLAY_STATE, state)
      overlay.setIgnoreMouseEvents(state === 'idle', { forward: true })
      if (state !== 'idle') overlay.moveTop()
      log('overlay', `state = ${state}`)
    }
  }

  return new RecordingOrchestrator(
    workerBridge,
    overlayBridge,
    buildPipeline(overlayBridge.setState.bind(overlayBridge)),
    onIdle
  )
}

function setupSettingsIpc(shortcutHandlers: { onToggle: () => void; onCancel: () => void }): void {
  ipcMain.handle(CHANNELS.SETTINGS_GET, () => getConfig())

  ipcMain.handle(CHANNELS.SETTINGS_SET, (_, partial: unknown) => {
    const prevConfig = getConfig()
    setConfig(partial as Parameters<typeof setConfig>[0])
    const newConfig = getConfig()
    let toggleFailed = false
    if (
      prevConfig.shortcuts.toggleRecording !== newConfig.shortcuts.toggleRecording ||
      prevConfig.shortcuts.cancelRecording !== newConfig.shortcuts.cancelRecording
    ) {
      unregisterShortcuts()
      const result = registerShortcuts(newConfig.shortcuts, shortcutHandlers, (a) =>
        log('shortcuts', `${a} is taken by another app`, 'warn')
      )
      toggleFailed = result.toggleFailed
    }
    if (prevConfig.startup.autostart !== newConfig.startup.autostart) {
      setAutostart(newConfig.startup.autostart)
    }
    if (
      prevConfig.ui.theme !== newConfig.ui.theme &&
      overlayWindow &&
      !overlayWindow.isDestroyed()
    ) {
      overlayWindow.webContents.send(CHANNELS.UI_THEME_CHANGED, newConfig.ui.theme)
    }
    if (
      (prevConfig.overlay.showTimer !== newConfig.overlay.showTimer ||
        prevConfig.overlay.invertColors !== newConfig.overlay.invertColors) &&
      overlayWindow &&
      !overlayWindow.isDestroyed()
    ) {
      overlayWindow.webContents.send(CHANNELS.OVERLAY_SETTINGS_CHANGED, newConfig.overlay)
    }
    return { toggleFailed }
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
  ipcMain.handle(CHANNELS.HISTORY_CLEAR, () => clearEntries())
  ipcMain.handle(CHANNELS.HISTORY_EXPORT, () => exportEntries())
  ipcMain.handle(CHANNELS.CLIPBOARD_WRITE, (_, text: string) => clipboard.writeText(text))

  ipcMain.handle(CHANNELS.SHORTCUTS_PAUSE, () => unregisterShortcuts())
  ipcMain.handle(CHANNELS.SHORTCUTS_RESUME, () =>
    registerShortcuts(getConfig().shortcuts, shortcutHandlers)
  )
  ipcMain.handle(CHANNELS.SHORTCUTS_GET_STATUS, () => ({
    toggleRegistered: isShortcutRegistered(getConfig().shortcuts.toggleRecording)
  }))

  ipcMain.handle(CHANNELS.SYSTEM_GET_LOCALE, () => getSystemLanguage())
  ipcMain.handle(CHANNELS.SHELL_OPEN_PATH, (_, path: string) => shell.openPath(path))

  ipcMain.handle(CHANNELS.RECORDINGS_GET_PATH, () => app.getPath('userData'))

  ipcMain.handle(CHANNELS.SHELL_OPEN_RECORDINGS_PATH, () => shell.openPath(app.getPath('userData')))
  ipcMain.handle(CHANNELS.SHELL_OPEN_EXTERNAL, (_, url: string) => shell.openExternal(url))

  ipcMain.handle(
    CHANNELS.OVERLAY_PREVIEW,
    (_, partial: { overlay?: ReturnType<typeof getConfig>['overlay']; theme?: string }) => {
      if (!overlayWindow || overlayWindow.isDestroyed()) return
      if (partial.overlay)
        overlayWindow.webContents.send(CHANNELS.OVERLAY_SETTINGS_CHANGED, partial.overlay)
      if (partial.theme) overlayWindow.webContents.send(CHANNELS.UI_THEME_CHANGED, partial.theme)
    }
  )

  ipcMain.handle(CHANNELS.OVERLAY_RESET_POSITION, () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return
    const { x, y } = defaultOverlayPosition()
    overlayWindow.setPosition(x, y)
    const cfg = getConfig()
    setConfig({ ui: { ...cfg.ui, overlayPosition: undefined } })
  })

  ipcMain.handle(CHANNELS.RECORDING_CANCEL, () => orchestrator?.cancel())

  ipcMain.handle(CHANNELS.UPDATE_GET_VERSION, () => app.getVersion())
  ipcMain.handle(CHANNELS.UPDATE_GET_STATUS, () => getLatestUpdateStatus())
  ipcMain.handle(CHANNELS.APP_GET_REPO_URL, () => repository)

  ipcMain.handle(CHANNELS.UPDATE_CHECK, () => {
    if (process.platform === 'win32') autoUpdater.checkForUpdates().catch(() => {})
  })

  ipcMain.handle(CHANNELS.UPDATE_INSTALL, () => {
    if (process.platform === 'win32') autoUpdater.quitAndInstall()
  })

  ipcMain.on(CHANNELS.LOG_WORKER, (_, scope: string, message: string, level: string) => {
    log(scope, message, level as Parameters<typeof log>[2])
  })
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (appWindow && !appWindow.isDestroyed()) {
      if (appWindow.isMinimized()) appWindow.restore()
      appWindow.focus()
    } else {
      openAppWindow()
    }
  })

  app.whenReady().then(async () => {
    electronApp.setAppUserModelId('com.sprik.app')
    Menu.setApplicationMenu(null)

    if (process.platform === 'darwin') {
      await systemPreferences.askForMediaAccess('microphone')
    }

    setupPermissions()

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    initUpdater(() => appWindow)

    workerWindow = createWorkerWindow()
    overlayWindow = createOverlayWindow(getConfig().ui.overlayPosition)
    overlayWindow.on('moved', () => {
      overlayWindow!.setSize(260, 44)
      const [x, y] = overlayWindow!.getPosition()
      const cfg = getConfig()
      setConfig({ ui: { ...cfg.ui, overlayPosition: { x, y } } })
      appWindow?.webContents.send(CHANNELS.OVERLAY_POSITION_CHANGED, { x, y })
    })

    const shortcutHandlers = {
      onToggle: () => {
        if (orchestrator?.getState() === 'idle') {
          const cfg = getConfig()
          const key = getKey(cfg.transcription.provider)
          if (!key) {
            log(
              'recording',
              `no API key configured for provider: ${cfg.transcription.provider}`,
              'warn'
            )
            const n = new Notification({
              title: 'Sprik — No API key',
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

    setAutostart(getConfig().startup.autostart)

    workerWindow.webContents.once('did-finish-load', () => {
      const config = getConfig()
      const { toggleFailed } = registerShortcuts(config.shortcuts, shortcutHandlers, (a) =>
        log('shortcuts', `${a} is taken by another app`, 'warn')
      )
      if (toggleFailed) {
        const n = new Notification({
          title: 'Sprik — Shortcut unavailable',
          body: `${config.shortcuts.toggleRecording} is already in use by another app. Change it in Settings.`
        })
        n.on('click', () => openAppWindow())
        n.show()
        openAppWindow()
      }
    })

    setupSettingsIpc(shortcutHandlers)

    createTray()

    app.on('activate', () => {
      if (
        BrowserWindow.getAllWindows().filter((w) => w !== workerWindow && w !== overlayWindow)
          .length === 0
      ) {
        openAppWindow()
      }
    })

    app.on('before-quit', () => {
      quitting = true
    })

    app.on('will-quit', () => {
      orchestrator?.deleteTempFile()
      unregisterShortcuts()
    })
  })

  // Keep app alive in tray when all visible windows are closed
  app.on('window-all-closed', () => {
    // Intentionally empty - app lives in the tray
  })
}
