import React, { useState, useEffect } from 'react'
import { Settings, History, Info, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import SettingsView from '../settings/App'
import HistoryView from '../history/App'
import AboutView from '../about/App'
import { useTheme } from '../shared/useTheme'
import type { Config, UpdateStatus } from '../shared/types'

type View = 'settings' | 'history' | 'about'

export default function App(): React.JSX.Element {
  const [view, setView] = useState<View>('settings')
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system')
  const [expanded, setExpanded] = useState(false)
  const [uiConfig, setUiConfig] = useState<Config['ui']>({
    theme: 'system',
    sidebarExpanded: false,
    detailsPanelWidth: 320
  })
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ phase: 'idle' })

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

  useEffect(() => window.api.onUpdateStatus(setUpdateStatus), [])

  async function toggleSidebar(): Promise<void> {
    const next = !expanded
    setExpanded(next)
    const nextUi = { ...uiConfig, sidebarExpanded: next }
    setUiConfig(nextUi)
    await window.api.setConfig({ ui: nextUi })
  }

  const updateReady = updateStatus.phase === 'ready'

  const navItems: { id: View; icon: React.JSX.Element; label: string; badge?: boolean }[] = [
    { id: 'settings', icon: <Settings size={20} />, label: 'Settings' },
    { id: 'history', icon: <History size={20} />, label: 'History' },
    { id: 'about', icon: <Info size={20} />, label: 'About', badge: updateReady }
  ]

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <nav
        className={`${expanded ? 'w-48' : 'w-14'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-[width] duration-200 overflow-hidden shrink-0`}
      >
        <div className="flex-1 flex flex-col gap-1 px-2 pt-4">
          {navItems.map(({ id, icon, label, badge }) => (
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
              <span className="relative shrink-0">
                {icon}
                {badge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </span>
              {expanded && <span className="text-sm font-medium whitespace-nowrap">{label}</span>}
            </button>
          ))}
        </div>

        <div className={`shrink-0 px-2 pb-3 flex ${expanded ? 'justify-start' : 'justify-center'}`}>
          <button
            onClick={toggleSidebar}
            title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {expanded ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </button>
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
        <div className={view === 'about' ? 'h-full' : 'hidden'}>
          <AboutView />
        </div>
      </div>
    </div>
  )
}
