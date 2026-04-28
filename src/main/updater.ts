import { autoUpdater } from 'electron-updater'
import type { BrowserWindow } from 'electron'
import { CHANNELS } from '../shared/channels'
import { log } from './logger'
import type { UpdateStatus } from '../renderer/shared/types'

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000

export function initUpdater(appWindow: BrowserWindow): void {
  if (process.platform !== 'win32') return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = null

  let pendingVersion = ''

  function send(status: UpdateStatus): void {
    if (!appWindow.isDestroyed()) {
      appWindow.webContents.send(CHANNELS.UPDATE_STATUS, status)
    }
  }

  autoUpdater.on('checking-for-update', () => send({ phase: 'checking' }))

  autoUpdater.on('update-available', (info) => {
    pendingVersion = info.version
    send({ phase: 'available', version: info.version })
  })

  autoUpdater.on('update-not-available', () => send({ phase: 'up-to-date' }))

  autoUpdater.on('download-progress', (p) =>
    send({ phase: 'downloading', version: pendingVersion, percent: Math.round(p.percent) })
  )

  autoUpdater.on('update-downloaded', (info) => send({ phase: 'ready', version: info.version }))

  autoUpdater.on('error', (err) => {
    log('updater', err.message, 'error')
    send({ phase: 'error', message: err.message })
  })

  autoUpdater.checkForUpdates()
  setInterval(() => autoUpdater.checkForUpdates(), CHECK_INTERVAL_MS)
}
