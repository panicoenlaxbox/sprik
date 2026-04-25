import React, { useState, useEffect } from 'react'
import { type OverlayState } from '../shared/types'
import { useTheme } from '../shared/useTheme'

export default function App(): React.JSX.Element {
  const [state, setState] = useState<OverlayState>('idle')
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system')

  useTheme(theme)

  useEffect(() => {
    window.api.getConfig().then((cfg) => setTheme(cfg.ui.theme))
    return window.api.onThemeChange(setTheme)
  }, [])

  useEffect(() => {
    const unsubscribe = window.api.onOverlayState((s) => setState(s as OverlayState))
    return unsubscribe
  }, [])

  if (state === 'idle') return <></>

  return (
    <div
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      className="w-fit flex items-center gap-2 px-3 py-2 rounded-full bg-white/95 dark:bg-black/85 text-gray-900 dark:text-white text-sm select-none border border-gray-200 dark:border-white/10 shadow-sm"
    >
      {state === 'recording' && (
        <>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>Recording…</span>
        </>
      )}
      {state === 'transcribing' && (
        <>
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span>Transcribing…</span>
        </>
      )}
      {state === 'processing' && (
        <>
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span>Processing…</span>
        </>
      )}
      {state === 'cancelled' && (
        <>
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          <span>Cancelled</span>
        </>
      )}
      {state === 'error' && (
        <>
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span>Error</span>
        </>
      )}
    </div>
  )
}
