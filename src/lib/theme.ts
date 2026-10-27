import { useState, useEffect } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'nutrirecipe_theme'

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return 'system'
}

export function applyTheme(mode: ThemeMode) {
  if (typeof window === 'undefined') return

  const root = document.documentElement
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = mode === 'dark' || (mode === 'system' && systemDark)

  if (isDark) {
    root.classList.add('dark')
    root.style.colorScheme = 'dark'
  } else {
    root.classList.remove('dark')
    root.style.colorScheme = 'light'
  }
}

export function setTheme(mode: ThemeMode) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, mode)
  applyTheme(mode)
  window.dispatchEvent(new CustomEvent('nutrirecipe_theme_changed', { detail: mode }))
}

export function initTheme() {
  if (typeof window === 'undefined') return

  const initial = getStoredTheme()
  applyTheme(initial)

  // Listen to OS theme changes if on system
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const listener = () => {
    if (getStoredTheme() === 'system') {
      applyTheme('system')
    }
  }

  mediaQuery.addEventListener('change', listener)
  return () => mediaQuery.removeEventListener('change', listener)
}

export function useTheme() {
  const [theme, setLocalTheme] = useState<ThemeMode>(getStoredTheme())

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<ThemeMode>
      setLocalTheme(customEvent.detail || getStoredTheme())
    }

    window.addEventListener('nutrirecipe_theme_changed', handleThemeChange)
    return () => window.removeEventListener('nutrirecipe_theme_changed', handleThemeChange)
  }, [])

  const changeTheme = (newTheme: ThemeMode) => {
    setTheme(newTheme)
    setLocalTheme(newTheme)
  }

  return { theme, setTheme: changeTheme }
}
