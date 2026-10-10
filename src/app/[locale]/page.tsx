import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getExercises } from '@/lib/actions/exercise'
import WorkoutLogger from '@/components/WorkoutLogger'

// This page uses authentication cookies — opt out of static prerendering
export const instant = false

export async function generateMetadata({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'workout' })
  return { title: t('title') }
}

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${locale}/login`)
  }

  const exercises = await getExercises()
  const t = await getTranslations({ locale, namespace: 'workout' })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">{t('title')}</h1>
        <span className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString(locale === 'zh-TW' ? 'zh-TW' : locale, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </span>
      </div>

      <WorkoutLogger exercises={exercises} />
    </div>
  )
}
