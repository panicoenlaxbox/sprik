import React, { useState, useEffect } from 'react'
import { Settings, Clock } from 'lucide-react'
import SettingsView from '../settings/App'
import HistoryView from '../history/App'
import { useTheme } from '../shared/useTheme'

type View = 'settings' | 'history'

export default function App(): React.JSX.Element {
  const [view, setView] = useState<View>('settings')
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system')

  useTheme(theme)

  useEffect(() => {
    window.api.getConfig().then((cfg) => setTheme(cfg.ui.theme))
  }, [])

  useEffect(() => window.api.onLog((scope, message, level) => {
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
    fn(`%c[${scope}]%c ${message}`, 'color:#6366f1;font-weight:bold', 'color:inherit')
  }), [])

  const navItems: { id: View; icon: React.JSX.Element; label: string }[] = [
    { id: 'settings', icon: <Settings size={20} />, label: 'Settings' },
    { id: 'history', icon: <Clock size={20} />, label: 'History' }
  ]

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="w-14 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center pt-4 gap-1">
        {navItems.map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            title={label}
            aria-label={label}
            className={`p-3 rounded-lg transition-colors ${
              view === id
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-400'
            }`}
          >
            {icon}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-auto min-h-0">
        {view === 'settings' ? <SettingsView onThemeChange={setTheme} /> : <HistoryView />}
      </div>
    </div>
  )
}
