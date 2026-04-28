import React, { useState, useEffect } from 'react'
import { RefreshCw, Download, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react'
import type { UpdateStatus } from '../shared/types'

export default function App(): React.JSX.Element {
  const [version, setVersion] = useState('')
  const [status, setStatus] = useState<UpdateStatus>({ phase: 'idle' })
  const isAutoUpdateSupported = window.api.isAutoUpdateSupported()

  useEffect(() => {
    window.api.getAppVersion().then(setVersion)
    return window.api.onUpdateStatus(setStatus)
  }, [])

  const isBusy =
    status.phase === 'checking' || status.phase === 'downloading' || status.phase === 'available'

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-950 flex flex-col">
      <header className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">About</h1>
      </header>

      <main className="flex-1 p-8 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Sprik</h2>
          {version && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Version {version}</p>
          )}
        </div>

        {isAutoUpdateSupported ? (
          <div className="space-y-4">
            <UpdateStatusMessage status={status} />

            {status.phase === 'ready' ? (
              <button
                onClick={() => window.api.installUpdate()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RotateCcw size={15} />
                Restart now
              </button>
            ) : (
              <button
                onClick={() => window.api.checkForUpdates()}
                disabled={isBusy}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                <RefreshCw size={15} className={isBusy ? 'animate-spin' : ''} />
                Check for updates
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Auto-update is not supported on this platform. Visit{' '}
            <a
              href="https://github.com/panicoenlaxbox/sprik/releases"
              onClick={(e) => {
                e.preventDefault()
                window.api.openExternalUrl('https://github.com/panicoenlaxbox/sprik/releases')
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              GitHub Releases
            </a>{' '}
            to download updates manually.
          </p>
        )}
      </main>
    </div>
  )
}

function UpdateStatusMessage({ status }: { status: UpdateStatus }): React.JSX.Element | null {
  switch (status.phase) {
    case 'idle':
      return null
    case 'checking':
      return <p className="text-sm text-gray-500 dark:text-gray-400">Checking for updates…</p>
    case 'up-to-date':
      return (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle size={15} />
          You&apos;re up to date
        </div>
      )
    case 'available':
      return (
        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
          <Download size={15} />
          Update {status.version} available, downloading…
        </div>
      )
    case 'downloading':
      return (
        <div className="text-sm text-blue-600 dark:text-blue-400">
          <div className="flex items-center gap-2 mb-1">
            <Download size={15} />
            Downloading {status.version}… {status.percent}%
          </div>
          <div className="w-48 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${status.percent}%` }}
            />
          </div>
        </div>
      )
    case 'ready':
      return (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle size={15} />
          {status.version} ready to install
        </div>
      )
    case 'error':
      return (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={15} />
          Could not check for updates
        </div>
      )
  }
}
