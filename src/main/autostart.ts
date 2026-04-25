import { app } from 'electron'
import { homedir } from 'os'
import { join } from 'path'
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs'

const DESKTOP_DIR = join(homedir(), '.config', 'autostart')
const DESKTOP_FILE = join(DESKTOP_DIR, 'sprik.desktop')

function desktopEntry(): string {
  return `[Desktop Entry]
Type=Application
Name=Sprik
Exec=${process.execPath}
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
`
}

export function setAutostart(enabled: boolean): void {
  if (process.platform === 'linux') {
    if (enabled) {
      if (!existsSync(DESKTOP_DIR)) mkdirSync(DESKTOP_DIR, { recursive: true })
      writeFileSync(DESKTOP_FILE, desktopEntry(), 'utf8')
    } else {
      if (existsSync(DESKTOP_FILE)) unlinkSync(DESKTOP_FILE)
    }
  } else {
    app.setLoginItemSettings({ openAtLogin: enabled })
  }
}

export function getAutostart(): boolean {
  if (process.platform === 'linux') return existsSync(DESKTOP_FILE)
  return app.getLoginItemSettings().openAtLogin
}
