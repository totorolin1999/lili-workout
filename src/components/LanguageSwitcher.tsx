'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { Globe } from 'lucide-react'
import type { Locale } from '@/i18n/routing'

const LOCALES: { value: Locale; label: string; flag: string }[] = [
  { value: 'hu', label: 'Magyar', flag: '🇭🇺' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'zh-TW', label: '繁體中文', flag: '🇹🇼' },
]

export default function LanguageSwitcher() {
  const t = useTranslations('language')
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()

  function handleChange(nextLocale: Locale) {
    // Replace current locale prefix in the path
    const segments = pathname.split('/')
    // segments[0] is '', segments[1] is current locale
    segments[1] = nextLocale
    router.push(segments.join('/'))
  }

  return (
    <div className="flex items-center gap-1.5">
      <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <select
        value={locale}
        onChange={(e) => handleChange(e.target.value as Locale)}
        aria-label={t('label')}
        style={{ colorScheme: 'dark' }}
        className="bg-transparent text-sm font-medium text-foreground cursor-pointer
                   border-none outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
                   rounded pr-1"
      >
        {LOCALES.map((loc) => (
          <option
            key={loc.value}
            value={loc.value}
            className="bg-zinc-900 text-white"
            style={{ backgroundColor: '#18181b', color: '#ffffff' }}
          >
            {loc.flag} {loc.label}
          </option>
        ))}
      </select>
    </div>
  )
}
