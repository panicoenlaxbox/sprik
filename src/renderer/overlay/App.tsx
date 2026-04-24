import { useState, useEffect } from 'react'

type RecordingState = 'idle' | 'recording' | 'transcribing'

export default function App(): JSX.Element {
  const [state, setState] = useState<RecordingState>('idle')

  useEffect(() => {
    // Will be wired to IPC in M2
  }, [])

  if (state === 'idle') return <></>

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-black/80 text-white text-sm shadow-lg">
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
