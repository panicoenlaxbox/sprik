import React, { useState, useEffect } from 'react'
import { Settings, Clock, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import SettingsView from '../settings/App'
import HistoryView from '../history/App'
import { useTheme } from '../shared/useTheme'
import type { Config } from '../shared/types'

type View = 'settings' | 'history'

export default function App(): React.JSX.Element {
  const [view, setView] = useState<View>('settings')
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system')
  const [expanded, setExpanded] = useState(false)
  const [uiConfig, setUiConfig] = useState<Config['ui']>({
    theme: 'system',
    sidebarExpanded: false
  })

  useTheme(theme)

  useEffect(() => {
    window.api.getConfig().then((cfg) => {
      setTheme(cfg.ui.theme)
      setExpanded(cfg.ui.sidebarExpanded)
      setUiConfig(cfg.ui)
    })
  }, [])

  useEffect(
    () =>
      window.api.onLog((scope, message, level) => {
        const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
        fn(`%c[${scope}]%c ${message}`, 'color:#6366f1;font-weight:bold', 'color:inherit')
      }),
    []
  )

  async function toggleSidebar(): Promise<void> {
    const next = !expanded
    setExpanded(next)
    const nextUi = { ...uiConfig, sidebarExpanded: next }
    setUiConfig(nextUi)
    await window.api.setConfig({ ui: nextUi })
  }

  const navItems: { id: View; icon: React.JSX.Element; label: string }[] = [
    { id: 'settings', icon: <Settings size={20} />, label: 'Settings' },
    { id: 'history', icon: <Clock size={20} />, label: 'History' }
  ]

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <nav
        className={`${expanded ? 'w-48' : 'w-14'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-[width] duration-200 overflow-hidden shrink-0`}
      >
        <div
          className={`h-[60px] flex items-center shrink-0 px-2 ${expanded ? 'justify-end' : 'justify-center'}`}
        >
          <button
            onClick={toggleSidebar}
            title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {expanded ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
        </div>

        <div className="flex flex-col gap-1 px-2 pt-2">
          {navItems.map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              title={expanded ? undefined : label}
              aria-label={label}
              className={`flex items-center gap-3 rounded-lg transition-colors ${expanded ? 'px-3 py-2' : 'p-3 justify-center'} ${
                view === id
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-400'
              }`}
            >
              {icon}
              {expanded && <span className="text-sm font-medium whitespace-nowrap">{label}</span>}
            </button>
          ))}
        </div>
      </nav>

      <div className="flex-1 overflow-auto min-h-0 relative">
        <div className={view === 'settings' ? 'h-full' : 'hidden'}>
          <SettingsView
            onThemeChange={(t) => {
              setTheme(t)
              setUiConfig((prev) => ({ ...prev, theme: t }))
            }}
          />
        </div>
        <div className={view === 'history' ? 'h-full' : 'hidden'}>
          <HistoryView />
        </div>
      </div>
    </div>
  )
}
