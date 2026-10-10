import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getExercises } from '@/lib/actions/exercise'
import { getExerciseDisplayName } from '@/lib/exercises'
import type { Locale } from '@/lib/exercises'
import ExerciseManager from '@/components/ExerciseManager'

// This page uses authentication cookies — opt out of static prerendering
export const instant = false

export async function generateMetadata({ params }: PageProps<'/[locale]/exercises'>) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'exercises' })
  return { title: t('title') }
}

export default async function ExercisesPage({ params }: PageProps<'/[locale]/exercises'>) {
  const { locale } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const exercises = await getExercises()

  return (
    <div className="space-y-4">
      <ExerciseManager
        exercises={exercises}
        locale={locale as Locale}
      />
    </div>
  )
}
