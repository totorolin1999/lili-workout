import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/server'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import ThemeToggle from '@/components/ThemeToggle'
import Link from 'next/link'
import { Dumbbell, History, BookOpen, LogOut, Shield } from 'lucide-react'
import { checkIsAdmin } from '@/lib/actions/admin'


export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout(props: LayoutProps<'/[locale]'>) {
  const { locale } = await props.params
  const { children } = props

  // Validate locale
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound()
  }

  setRequestLocale(locale)

  // Fetch messages and translations for this locale
  const messages = await getMessages({ locale })
  const tApp = await getTranslations({ locale, namespace: 'app' })
  const tNav = await getTranslations({ locale, namespace: 'nav' })

  // Check auth — redirect to login if unauthenticated (except for login page itself)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isAdmin = false
  if (user) {
    const adminCheck = await checkIsAdmin()
    isAdmin = adminCheck.isAdmin
  }

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <div className="min-h-screen bg-background flex flex-col">
        {/* App shell — mobile-width by default, expands for admin dashboard & system design simulator */}
        <div className="w-full max-w-md has-[.admin-wide-container]:max-w-5xl has-[.system-design-container]:max-w-6xl mx-auto flex flex-col min-h-screen
                        border-x border-border/30 shadow-xl bg-background transition-[max-width]">
          {/* Top nav bar */}
          {user && (
            <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
              <div className="flex items-center justify-between px-4 py-3">
                <Link href={`/${locale}`} className="text-base font-bold text-foreground tracking-tight">
                  🏋️ {tApp('name')}
                </Link>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Link
                      href={`/${locale}/admin`}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1"
                      aria-label={tNav('admin')}
                      title={tNav('admin')}
                    >
                      <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </Link>
                  )}
                  <ThemeToggle />
                  <LanguageSwitcher />
                  <form action={async () => { 'use server'; const { createClient } = await import('@/lib/supabase/server'); const s = await createClient(); await s.auth.signOut(); }}>
                    <button
                      type="submit"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      aria-label={tNav('logout')}
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            </header>
          )}

          {/* Page content */}
          <main className="flex-1 px-4 py-4 overflow-y-auto">
            {children}
          </main>

          {/* Bottom nav (only when logged in) */}
          {user && (
            <nav className="sticky bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
              <div className={`grid ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'} divide-x divide-border`}>
                <NavItem href={`/${locale}`} icon={<Dumbbell className="h-5 w-5" />} label={tNav('workout')} />
                <NavItem href={`/${locale}/exercises`} icon={<BookOpen className="h-5 w-5" />} label={tNav('exercises')} />
                <NavItem href={`/${locale}/history`} icon={<History className="h-5 w-5" />} label={tNav('history')} />
                {isAdmin && (
                  <NavItem href={`/${locale}/admin`} icon={<Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />} label={tNav('admin')} />
                )}
              </div>
            </nav>
          )}
        </div>
      </div>
    </NextIntlClientProvider>
  )
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-0.5 py-2.5
                 text-muted-foreground hover:text-primary transition-colors text-xs font-medium"
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}
