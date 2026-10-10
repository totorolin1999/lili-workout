import { getTranslations, setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginForm from '@/components/LoginForm'
import LanguageSwitcher from '@/components/LanguageSwitcher'


export async function generateMetadata({ params }: PageProps<'/[locale]/login'>) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'auth' })
  return { title: t('title') }
}

export default async function LoginPage({ params }: PageProps<'/[locale]/login'>) {
  const { locale } = await params
  setRequestLocale(locale)
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    redirect(`/${locale}`)
  }

  const t = await getTranslations({ locale, namespace: 'auth' })
  const tApp = await getTranslations({ locale, namespace: 'app' })

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 px-2">
      {/* Language switcher */}
      <div className="self-end">
        <LanguageSwitcher />
      </div>

      {/* Card */}
      <div className="w-full max-w-sm space-y-6">
        {/* Logo / Title */}
        <div className="text-center space-y-2">
          <div className="text-5xl">🏋️</div>
          <h1 className="text-2xl font-bold text-foreground">{tApp('name')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>

        {/* Form */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
