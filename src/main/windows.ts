import { BrowserWindow, nativeImage, screen, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

export function createAppWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 760,
    height: 560,
    minWidth: 600,
    minHeight: 400,
    show: false,
    title: 'Sprik',
    icon: nativeImage.createFromPath(icon),
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.on('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/app/index.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/app/index.html'))
  }

  return win
}

export function createWorkerWindow(): BrowserWindow {
  const win = new BrowserWindow({
    show: false,
    width: 1,
    height: 1,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/worker.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // The worker window is never shown, so Chromium would throttle its timers
      // and the MediaRecorder chunk callbacks along with them.
      backgroundThrottling: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/worker/index.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/worker/index.html'))
  }

  return win
}

export function defaultOverlayPosition(): { x: number; y: number } {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  return { x: Math.round(width / 2 - 110), y: height - 80 }
}

export function createOverlayWindow(savedPosition?: { x: number; y: number }): BrowserWindow {
  const { x, y } = savedPosition ?? defaultOverlayPosition()

  const win = new BrowserWindow({
    width: 260,
    height: 44,
    x,
    y,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    alwaysOnTop: true,
    focusable: false,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Without this the overlay stops producing frames after being idle for a
      // while: state changes arrive but never paint, so the user sees nothing.
      backgroundThrottling: false
    }
  })

  win.once('ready-to-show', () => {
    win.showInactive()
    win.setAlwaysOnTop(true, 'screen-saver')
    win.setIgnoreMouseEvents(true, { forward: true })
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/overlay/index.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/overlay/index.html'))
  }

  return win
}
