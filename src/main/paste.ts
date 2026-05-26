import { clipboard, Notification } from 'electron'
import { exec } from 'child_process'
import { log } from './logger'
import { SCOPES } from '../shared/scopes'

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

export type PasteMode = 'clipboard-and-focus' | 'clipboard-only' | 'focus-only'

export async function copyAndPaste(
  text: string,
  mode: PasteMode = 'clipboard-and-focus'
): Promise<void> {
  if (mode === 'clipboard-only') {
    clipboard.writeText(text)
    return
  }

  if (mode === 'focus-only') {
    const hasImage = clipboard.availableFormats().some((f) => f.startsWith('image/'))
    const previousText = clipboard.readText()
    const previousImage = hasImage ? clipboard.readImage() : null

    clipboard.writeText(text)
    try {
      await execPromise(getPasteCommand())
    } catch (err) {
      log(SCOPES.paste, `native paste failed: ${(err as Error).message}`, 'warn')
      new Notification({
        title: 'Sprik - Auto-paste failed',
        body: 'Text copied to clipboard - paste it manually.'
      }).show()
      return
    } finally {
      if (previousImage && !previousImage.isEmpty()) {
        clipboard.writeImage(previousImage)
      } else {
        clipboard.writeText(previousText)
      }
    }
    return
  }

  // clipboard-and-focus
  clipboard.writeText(text)
  try {
    await execPromise(getPasteCommand())
  } catch (err) {
    log(
      SCOPES.paste,
      `native paste failed, text is in clipboard: ${(err as Error).message}`,
      'warn'
    )
    new Notification({
      title: 'Sprik - Auto-paste failed',
      body: 'Text copied to clipboard - paste it manually.'
    }).show()
  }
}
