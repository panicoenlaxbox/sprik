import { app, type BrowserWindow } from 'electron'
import pkg from 'electron-updater'
import { CHANNELS } from '../shared/channels'
import { log } from './logger'
import { getConfig } from './store'
import type { UpdateStatus } from '../renderer/shared/types'

const { autoUpdater } = pkg
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000

export function initUpdater(getWindow: () => BrowserWindow | null): void {
  if (process.platform !== 'win32') return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = null
  if (!app.isPackaged) {
    autoUpdater.forceDevUpdateConfig = true
  }

  let pendingVersion = ''

  function send(status: UpdateStatus): void {
    const win = getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(CHANNELS.UPDATE_STATUS, status)
    }
  }

  autoUpdater.on('checking-for-update', () => {
    log('updater', 'Checking for update...')
    send({ phase: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    pendingVersion = info.version
    log('updater', `Update available: ${info.version}`)
    send({ phase: 'available', version: info.version })
  })

  autoUpdater.on('update-not-available', (info) => {
    log('updater', `Already up to date (${info.version})`)
    send({ phase: 'up-to-date' })
  })

  let lastLoggedPercent = -1
  autoUpdater.on('download-progress', (p) => {
    const percent = Math.round(p.percent)
    if (Math.floor(percent / 10) > Math.floor(lastLoggedPercent / 10)) {
      log('updater', `Downloading ${pendingVersion}... ${percent}%`)
      lastLoggedPercent = percent
    }
    send({ phase: 'downloading', version: pendingVersion, percent })
  })

  autoUpdater.on('update-downloaded', (info) => {
    log('updater', `Update downloaded: ${info.version}`)
    send({ phase: 'ready', version: info.version })
  })

  autoUpdater.on('error', (err) => {
    log('updater', err.message, 'error')
    send({ phase: 'error', message: err.message })
  })

  if (getConfig().startup.autoCheck) {
    autoUpdater.checkForUpdates().catch(() => {})
  }
  setInterval(() => {
    if (getConfig().startup.autoCheck) {
      autoUpdater.checkForUpdates().catch(() => {})
    }
  }, CHECK_INTERVAL_MS)
}
