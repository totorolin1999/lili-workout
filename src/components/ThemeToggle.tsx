'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Sun, Moon } from 'lucide-react'

type Theme = 'light' | 'dark'

function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return

  const root = document.documentElement
  const isDark = theme === 'dark'

  if (isDark) {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.remove('dark')
    root.classList.add('light')
  }

  const metaTheme = document.querySelector('meta[name="theme-color"]')
  if (metaTheme) {
    metaTheme.setAttribute('content', isDark ? '#031422' : '#004c87')
  }
}

export default function ThemeToggle() {
  const t = useTranslations('theme')
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  // Initialize theme on client mount
  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored)
      applyTheme(stored)
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const initial: Theme = prefersDark ? 'dark' : 'light'
      setTheme(initial)
      applyTheme(initial)
    }
  }, [])

  // Sync across tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'theme') {
        const nextTheme = (e.newValue as Theme) || 'light'
        setTheme(nextTheme)
        applyTheme(nextTheme)
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const handleToggle = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
    applyTheme(nextTheme)
  }

  // Pre-render placeholder before mounting to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="p-1.5 rounded-lg text-muted-foreground w-7 h-7" aria-hidden="true" />
    )
  }

  const isDark = theme === 'dark'
  const actionLabel = isDark ? t('light') : t('dark')

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center"
      aria-label={actionLabel}
      title={actionLabel}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-500 transition-transform duration-200 hover:rotate-12" />
      ) : (
        <Moon className="h-4 w-4 text-sky-600 transition-transform duration-200 hover:-rotate-12" />
      )}
    </button>
  )
}
