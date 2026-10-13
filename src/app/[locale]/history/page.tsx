import { getTranslations, setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getWorkoutHistory } from '@/lib/actions/workout'
import { getExercises } from '@/lib/actions/exercise'
import type { Locale } from '@/lib/exercises'
import WorkoutHistoryList from '@/components/WorkoutHistoryList'

export async function generateMetadata({ params }: PageProps<'/[locale]/history'>) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'history' })
  return { title: t('title') }
}

export default async function HistoryPage({ params }: PageProps<'/[locale]/history'>) {
  const { locale } = await params
  setRequestLocale(locale)
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const [workouts, exercises] = await Promise.all([
    getWorkoutHistory(),
    getExercises(),
  ])

  return (
    <WorkoutHistoryList
      initialWorkouts={workouts}
      exercises={exercises}
      locale={locale as Locale}
    />
  )
}

