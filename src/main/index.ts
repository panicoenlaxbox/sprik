import { app, BrowserWindow, Tray, Menu, nativeImage, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

let tray: Tray | null = null
let settingsWindow: BrowserWindow | null = null

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

  settingsWindow.on('ready-to-show', () => {
    settingsWindow?.show()
  })

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
    {
      label: 'Settings',
      click: () => createSettingsWindow()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit()
    }
  ])

  tray.setContextMenu(menu)
  tray.on('click', () => createSettingsWindow())
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.murmur.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSettingsWindow()
    }
  })
})

// Keep the app running even when all windows are closed (lives in tray)
app.on('window-all-closed', () => {
  if (process.platform === 'darwin') {
    // On macOS, keep app alive — the tray icon is enough
  }
})
