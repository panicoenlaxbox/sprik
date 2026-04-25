import React, { useState, useEffect } from 'react'

interface Props {
  deviceId: string | undefined
  onChange: (deviceId: string | undefined) => void
}

export default function MicrophoneSelector({ deviceId, onChange }: Props): React.JSX.Element {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((all) =>
      setDevices(all.filter((d) => d.kind === 'audioinput'))
    ).catch(() => {})
  }, [])

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="mic-select" className="text-xs text-gray-500 dark:text-gray-400">Microphone</label>
      <select
        id="mic-select"
        aria-label="Microphone"
        value={deviceId ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="w-fit text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
      >
        <option value="">System default</option>
        {devices.map((d, i) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || `Microphone ${i + 1}`}
          </option>
        ))}
      </select>
    </div>
  )
}
