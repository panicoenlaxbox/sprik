import React from 'react'
import { FolderOpen } from 'lucide-react'
import type { Config } from '../../shared/types'

interface Props {
  config: Config['recordings']
  recordingsPath: string
  onChange: (updates: Partial<Config['recordings']>) => void
}

export default function StorageSettings({ config, recordingsPath, onChange }: Props): React.JSX.Element {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={config.saveText}
          onChange={(e) => onChange({ saveText: e.target.checked })}
          aria-label="Save transcript"
          className="rounded"
        />
        Save transcript
      </label>

      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={config.saveAudio}
          onChange={(e) => onChange({ saveAudio: e.target.checked })}
          aria-label="Save audio"
          className="rounded"
        />
        Save audio
      </label>

      {recordingsPath && (
        <div className="flex items-center gap-2 text-xs text-gray-500 pt-1 min-w-0">
          <button
            type="button"
            onClick={() => window.api.openRecordingsFolder()}
            className="flex items-center gap-1 text-blue-600 hover:underline truncate cursor-pointer"
          >
            <FolderOpen size={12} className="shrink-0" />
            <span className="truncate">{recordingsPath}</span>
          </button>
        </div>
      )}
    </div>
  )
}
