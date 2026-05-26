import { app, Notification, type BrowserWindow } from 'electron'
import pkg from 'electron-updater'
import { CHANNELS } from '../shared/channels'
import { log } from './logger'
import { SCOPES } from '../shared/scopes'
import { getConfig } from './store'
import type { UpdateStatus } from '../renderer/shared/types'

const { autoUpdater } = pkg

let latestStatus: UpdateStatus = { phase: 'idle' }
let pendingNavigation: string | null = null

export function getLatestUpdateStatus(): UpdateStatus {
  return latestStatus
}

export function getAndClearPendingNavigation(): string | null {
  const nav = pendingNavigation
  pendingNavigation = null
  return nav
}

export function initUpdater(
  getWindow: () => BrowserWindow | null,
  openWindow: () => BrowserWindow,
  onStatusChange?: (status: UpdateStatus) => void
): void {
  if (process.platform !== 'win32') return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = null
  if (!app.isPackaged) {
    autoUpdater.forceDevUpdateConfig = true
  }

  let pendingVersion = ''

  function send(status: UpdateStatus): void {
    latestStatus = status
    onStatusChange?.(status)
    const win = getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(CHANNELS.UPDATE_STATUS, status)
    }
  }

  autoUpdater.on('checking-for-update', () => {
    log(SCOPES.updater, 'Checking for update...')
    send({ phase: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    pendingVersion = info.version
    log(SCOPES.updater, `Update available: ${info.version}`)
    send({ phase: 'available', version: info.version })
  })

  autoUpdater.on('update-not-available', (info) => {
    log(SCOPES.updater, `Already up to date (${info.version})`)
    send({ phase: 'up-to-date' })
  })

  let lastLoggedPercent = -1
  autoUpdater.on('download-progress', (p) => {
    const percent = Math.round(p.percent)
    if (Math.floor(percent / 10) > Math.floor(lastLoggedPercent / 10)) {
      log(SCOPES.updater, `Downloading ${pendingVersion}... ${percent}%`)
      lastLoggedPercent = percent
    }
    send({ phase: 'downloading', version: pendingVersion, percent })
  })

  autoUpdater.on('update-downloaded', (info) => {
    log(SCOPES.updater, `Update downloaded: ${info.version}`)
    send({ phase: 'ready', version: info.version })
    const n = new Notification({
      title: 'Sprik update ready',
      body: `Version ${info.version} is ready to install. Open Sprik to restart.`
    })
    n.on('click', () => {
      pendingNavigation = 'about'
      const win = openWindow()
      if (!win.webContents.isLoading()) {
        win.webContents.send(CHANNELS.NAVIGATE, 'about')
        pendingNavigation = null
      }
    })
    n.show()
  })

  autoUpdater.on('error', (err) => {
    log(SCOPES.updater, err.message, 'error')
    send({ phase: 'error', message: err.message })
  })

  log(SCOPES.updater, `Current version: ${app.getVersion()}`)
  if (getConfig().startup.autoCheck) {
    autoUpdater.checkForUpdates().catch(() => {})
  }

  function scheduleNextCheck(): void {
    const intervalMs = getConfig().startup.checkIntervalHours * 60 * 60 * 1000
    setTimeout(() => {
      if (getConfig().startup.autoCheck) {
        autoUpdater.checkForUpdates().catch(() => {})
      }
      scheduleNextCheck()
    }, intervalMs)
  }
  scheduleNextCheck()
}
