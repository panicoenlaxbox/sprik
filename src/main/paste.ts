import { clipboard, Notification } from 'electron'
import { exec } from 'child_process'
import { log } from './logger'

function execPromise(cmd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(cmd, (err) => (err ? reject(err) : resolve()))
  })
}

export function getPasteCommand(): string {
  if (process.platform === 'win32') {
    return 'powershell -NoProfile -NonInteractive -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait(\'^v\')"'
  }
  if (process.platform === 'darwin') {
    return 'osascript -e \'tell application "System Events" to keystroke "v" using command down\''
  }
  // Linux
  return process.env['XDG_SESSION_TYPE'] === 'wayland' ? 'ydotool key ctrl+v' : 'xdotool key ctrl+v'
}

export async function copyAndPaste(text: string, autoPaste = true): Promise<void> {
  clipboard.writeText(text)

  if (!autoPaste) return

  try {
    await execPromise(getPasteCommand())
  } catch (err) {
    log('paste', `native paste failed, text is in clipboard: ${(err as Error).message}`, 'warn')
    new Notification({
      title: 'Sprik — Auto-paste failed',
      body: 'Text copied to clipboard — paste it manually.'
    }).show()
  }
}
