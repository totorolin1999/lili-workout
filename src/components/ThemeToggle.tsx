'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Sun, Moon, Monitor, Check } from 'lucide-react'

type Theme = 'light' | 'dark' | 'system'

function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return

  const root = document.documentElement
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  if (isDark) {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.remove('dark')
    if (theme === 'light') {
      root.classList.add('light')
    } else {
      root.classList.remove('light')
    }
  }

  const metaTheme = document.querySelector('meta[name="theme-color"]')
  if (metaTheme) {
    metaTheme.setAttribute('content', isDark ? '#031422' : '#004c87')
  }
}

export default function ThemeToggle() {
  const t = useTranslations('theme')
  const [theme, setTheme] = useState<Theme>('system')
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Initialize theme from localStorage on client mount
  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      setTheme(stored)
      applyTheme(stored)
    } else {
      setTheme('system')
      applyTheme('system')
    }
  }, [])

  // Listen to system dark mode changes when set to 'system'
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const current = (localStorage.getItem('theme') as Theme) || 'system'
      if (current === 'system') {
        applyTheme('system')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Sync across tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'theme') {
        const nextTheme = (e.newValue as Theme) || 'system'
        setTheme(nextTheme)
        applyTheme(nextTheme)
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // Close menu on click outside or escape key
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = (nextTheme: Theme) => {
    setTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
    applyTheme(nextTheme)
    setIsOpen(false)
  }

  // Pre-render placeholder before mounting to avoid layout shift and hydration mismatch
  if (!mounted) {
    return (
      <div className="p-1.5 rounded-lg text-muted-foreground w-7 h-7" aria-hidden="true" />
    )
  }

  const options: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: t('light'), icon: Sun },
    { value: 'dark', label: t('dark'), icon: Moon },
    { value: 'system', label: t('system'), icon: Monitor },
  ]

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center"
        aria-label={t('label')}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {theme === 'light' && <Sun className="h-4 w-4 text-amber-500" />}
        {theme === 'dark' && <Moon className="h-4 w-4 text-sky-400" />}
        {theme === 'system' && <Monitor className="h-4 w-4 text-muted-foreground" />}
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-36 rounded-xl bg-card border border-border shadow-lg py-1.5 z-50 focus:outline-none"
        >
          {options.map((opt) => {
            const Icon = opt.icon
            const isSelected = theme === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                role="menuitem"
                onClick={() => handleSelect(opt.value)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                  isSelected
                    ? 'bg-muted text-foreground font-semibold'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    opt.value === 'light'
                      ? 'text-amber-500'
                      : opt.value === 'dark'
                      ? 'text-sky-400'
                      : 'text-muted-foreground'
                  }`}
                />
                <span className="flex-1">{opt.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
