import React, { useState, useEffect } from 'react'
import { Settings, Clock } from 'lucide-react'
import SettingsView from '../settings/App'
import HistoryView from '../history/App'

type View = 'settings' | 'history'

export default function App(): React.JSX.Element {
  const [view, setView] = useState<View>('settings')

  useEffect(() => window.api.onLog((scope, message) => {
    console.log(`%c[${scope}]%c ${message}`, 'color:#6366f1;font-weight:bold', 'color:inherit')
  }), [])

  const navItems: { id: View; icon: React.JSX.Element; label: string }[] = [
    { id: 'settings', icon: <Settings size={20} />, label: 'Settings' },
    { id: 'history', icon: <Clock size={20} />, label: 'History' }
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      <nav className="w-14 bg-white border-r border-gray-200 flex flex-col items-center pt-4 gap-1">
        {navItems.map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            title={label}
            aria-label={label}
            className={`p-3 rounded-lg transition-colors ${
              view === id
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            }`}
          >
            {icon}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-auto min-h-0">
        {view === 'settings' ? <SettingsView /> : <HistoryView />}
      </div>
    </div>
  )
}
