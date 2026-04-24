import React, { useState, useEffect } from 'react'
import { type OverlayState } from '../shared/types'

export default function App(): React.JSX.Element {
  const [state, setState] = useState<OverlayState>('idle')

  useEffect(() => {
    const unsubscribe = window.api.onOverlayState((s) => setState(s as OverlayState))
    return unsubscribe
  }, [])

  if (state === 'idle') return <></>

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-black/80 text-white text-sm shadow-lg select-none">
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
    </div>
  )
}
