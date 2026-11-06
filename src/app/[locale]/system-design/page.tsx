import { connection } from 'next/server'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import SystemDesignSimulator from '@/components/SystemDesignSimulator'

interface SystemDesignPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata(props: SystemDesignPageProps) {
  const { locale } = await props.params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'systemDesign' })
  return {
    title: `${t('title')} | Lili Workout`,
    description: t('subtitle'),
  }
}

export default async function SystemDesignPage(props: SystemDesignPageProps) {
  await connection()
  const { locale } = await props.params
  setRequestLocale(locale)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="system-design-container py-2">
      <SystemDesignSimulator locale={locale} isLoggedIn={!!user} />
    </div>
  )
}
