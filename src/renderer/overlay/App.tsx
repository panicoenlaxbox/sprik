import React, { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { type OverlayState } from '../shared/types'
import { useTheme } from '../shared/useTheme'
import { SCOPES } from '../../shared/scopes'

function formatElapsed(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

const CANCELLABLE_STATES: OverlayState[] = ['starting', 'recording', 'transcribing', 'processing']

/**
 * States that show an elapsed timer, grouped so the counter restarts when the
 * group changes: waiting for the microphone is timed on its own, and the actual
 * recording starts from zero once the device is open.
 */
function timerGroup(state: OverlayState): 'starting' | 'recording' | null {
  if (state === 'starting') return 'starting'
  if (state === 'recording' || state === 'transcribing' || state === 'processing')
    return 'recording'
  return null
}

/**
 * Elapsed timer. Tabular digits keep the pill from reshuffling (and the close
 * button from shifting) every time a digit changes width.
 */
function Elapsed({ seconds }: { seconds: number }): React.JSX.Element {
  return <span className="ml-1.5 tabular-nums">{formatElapsed(seconds)}</span>
}

/** Trailing ellipsis whose dots pulse in sequence (see `.overlay-dot` in index.css). */
function Dots(): React.JSX.Element {
  return (
    <span className="overlay-dots" aria-hidden="true">
      <span className="overlay-dot">.</span>
      <span className="overlay-dot">.</span>
      <span className="overlay-dot">.</span>
    </span>
  )
}

export default function App(): React.JSX.Element {
  const [state, setState] = useState<OverlayState>('idle')
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system')
  const [showTimer, setShowTimer] = useState(true)
  const [invertColors, setInvertColors] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const startTimeRef = useRef<number>(0)
  const prevStateRef = useRef<OverlayState>('idle')
  const nextStateRef = useRef<OverlayState>('idle')

  useTheme(theme)

  useEffect(() => {
    window.api.getConfig().then((cfg) => {
      setTheme(cfg.ui.theme)
      setShowTimer(cfg.overlay.showTimer)
      setInvertColors(cfg.overlay.invertColors)
    })
    return window.api.onThemeChange(setTheme)
  }, [])

  useEffect(() => {
    const unsubscribe = window.api.onOverlayState((s) => {
      window.api.log(SCOPES.overlay, `received ${s}`, 'info')
      nextStateRef.current = s as OverlayState
      setState(s as OverlayState)
    })
    return unsubscribe
  }, [])

  // Diagnostic: log when the overlay has actually painted a new state, to
  // measure perceived latency between the shortcut press and visible feedback.
  // Double rAF ensures the log fires after the browser has committed the frame.
  useEffect(() => {
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        window.api.log(SCOPES.overlay, `painted ${state}`, 'info')
      })
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [state])

  useEffect(() => {
    return window.api.onOverlaySettingsChange((overlay) => {
      setShowTimer(overlay.showTimer)
      setInvertColors(overlay.invertColors)
    })
  }, [])

  useEffect(() => {
    const group = timerGroup(state)
    if (group) {
      const carryOver = group === timerGroup(prevStateRef.current)
      if (!carryOver) {
        startTimeRef.current = Date.now()
        setElapsed(0)
      }
      const id = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
      prevStateRef.current = state
      return () => {
        clearInterval(id)
        if (!timerGroup(nextStateRef.current)) {
          setElapsed(0)
        }
      }
    }
    prevStateRef.current = state
    return undefined
  }, [state])

  // The pill stays mounted while idle (hidden via opacity) instead of rendering
  // nothing: an empty transparent window gets treated as not visible on
  // Windows, which freezes the compositor and makes the next state invisible.
  const idle = state === 'idle'

  return (
    <div
      style={
        {
          WebkitAppRegion: 'drag',
          opacity: idle ? 0 : 1,
          pointerEvents: idle ? 'none' : undefined
        } as React.CSSProperties
      }
      className={`w-fit flex items-center gap-2 px-3 py-2 mx-1 rounded-full text-sm font-medium select-none border whitespace-nowrap ${
        invertColors
          ? 'bg-zinc-900 dark:bg-white text-white dark:text-gray-900 border-zinc-700 dark:border-gray-300'
          : 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white border-gray-400 dark:border-zinc-600'
      }`}
    >
      {state === 'starting' && (
        <>
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          <span>
            Starting mic
            <Dots />
            {showTimer && <Elapsed seconds={elapsed} />}
          </span>
        </>
      )}
      {state === 'recording' && (
        <>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>
            Recording
            <Dots />
            {showTimer && <Elapsed seconds={elapsed} />}
          </span>
        </>
      )}
      {state === 'transcribing' && (
        <>
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span>
            Transcribing
            <Dots />
            {showTimer && <Elapsed seconds={elapsed} />}
          </span>
        </>
      )}
      {state === 'processing' && (
        <>
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span>
            Processing
            <Dots />
            {showTimer && <Elapsed seconds={elapsed} />}
          </span>
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
          className={`transition-colors cursor-pointer ${
            invertColors
              ? 'text-gray-400 hover:text-gray-200 dark:text-gray-500 dark:hover:text-gray-700'
              : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}
