import { useEffect } from 'react'

export function useTheme(theme: 'system' | 'light' | 'dark' | undefined): void {
  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    function apply(): void {
      const dark =
        theme === 'dark' || (theme !== 'light' && media.matches)
      root.classList.toggle('dark', dark)
    }

    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
}
