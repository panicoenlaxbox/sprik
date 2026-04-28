import React, { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { type OverlayState } from '../shared/types'
import { useTheme } from '../shared/useTheme'

function formatElapsed(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

const TIMED_STATES: OverlayState[] = ['recording', 'transcribing', 'processing']
const CANCELLABLE_STATES: OverlayState[] = ['recording', 'transcribing', 'processing']

export default function App(): React.JSX.Element {
  const [state, setState] = useState<OverlayState>('idle')
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system')
  const [showTimer, setShowTimer] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const startTimeRef = useRef<number>(0)

  useTheme(theme)

  useEffect(() => {
    window.api.getConfig().then((cfg) => {
      setTheme(cfg.ui.theme)
      setShowTimer(cfg.overlay.showTimer)
    })
    return window.api.onThemeChange(setTheme)
  }, [])

  useEffect(() => {
    const unsubscribe = window.api.onOverlayState((s) => {
      if (s !== 'idle') {
        window.api.getConfig().then((cfg) => setShowTimer(cfg.overlay.showTimer))
      }
      setState(s as OverlayState)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (TIMED_STATES.includes(state)) {
      startTimeRef.current = Date.now()
      const id = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
      return () => {
        clearInterval(id)
        setElapsed(0)
      }
    }
    return undefined
  }, [state])

  if (state === 'idle') return <></>

  return (
    <div
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      className="w-fit flex items-center gap-2 px-3 py-2 mx-1 rounded-full bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-sm font-medium select-none border border-gray-400 dark:border-zinc-600 whitespace-nowrap"
    >
      {state === 'recording' && (
        <>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>Recording...{showTimer && ` ${formatElapsed(elapsed)}`}</span>
        </>
      )}
      {state === 'transcribing' && (
        <>
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span>Transcribing...{showTimer && ` ${formatElapsed(elapsed)}`}</span>
        </>
      )}
      {state === 'processing' && (
        <>
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span>Processing...{showTimer && ` ${formatElapsed(elapsed)}`}</span>
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
      {CANCELLABLE_STATES.includes(state) && (
        <button
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          onClick={() => window.api.cancelRecording()}
          className="ml-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}
