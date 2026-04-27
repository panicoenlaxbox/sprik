# Running Sprik on macOS

Sprik is not notarized, so macOS will block it on first launch. Follow these steps.

## 1. Open the app

After installing from the DMG, macOS will say the app cannot be opened. To bypass this:

System Settings → Privacy & Security → scroll down → **Open Anyway**

This is a one-time step.

## 2. Microphone access

On first launch, macOS will ask whether Sprik can access the microphone. Allow it.

If the prompt never appeared, go to System Settings → Privacy & Security → **Microphone** and enable Sprik manually.

## 3. Auto-paste (Accessibility access)

Auto-paste simulates `Cmd+V` to paste the transcription into the active app. This requires Accessibility permission.

On first use, macOS will show a prompt asking Sprik to control the computer. Click **Open System Settings**, then enable the toggle for Sprik under Privacy & Security → **Accessibility**.

If you prefer not to grant this permission, disable auto-paste in Settings → Paste. The transcription will still be copied to the clipboard.
