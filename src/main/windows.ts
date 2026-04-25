import { BrowserWindow, screen, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

export function createAppWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 760,
    height: 560,
    minWidth: 600,
    minHeight: 400,
    show: false,
    title: 'Sprik',
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
      sandbox: true
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/worker/index.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/worker/index.html'))
  }

  return win
}

export function createOverlayWindow(savedPosition?: { x: number; y: number }): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  const x = savedPosition?.x ?? Math.round(width / 2 - 110)
  const y = savedPosition?.y ?? height - 80

  const win = new BrowserWindow({
    width: 160,
    height: 40,
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
      sandbox: true
    }
  })

  win.once('ready-to-show', () => {
    win.showInactive()
    win.setIgnoreMouseEvents(true, { forward: true })
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/overlay/index.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/overlay/index.html'))
  }

  return win
}
