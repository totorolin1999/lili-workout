import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['hu', 'en', 'zh-TW'],
  defaultLocale: 'hu',
  localePrefix: 'always',
})

export type Locale = (typeof routing.locales)[number]
