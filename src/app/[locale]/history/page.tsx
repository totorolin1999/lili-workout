import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getWorkoutHistory, type WorkoutHistoryEntry } from '@/lib/actions/workout'
import { getExerciseDisplayName } from '@/lib/exercises'
import type { Locale } from '@/lib/exercises'
import { Calendar, Dumbbell } from 'lucide-react'


export async function generateMetadata({ params }: PageProps<'/[locale]/history'>) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'history' })
  return { title: t('title') }
}

export default async function HistoryPage({ params }: PageProps<'/[locale]/history'>) {
  const { locale } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const workouts = await getWorkoutHistory()
  const t = await getTranslations({ locale, namespace: 'history' })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">{t('title')}</h1>

      {workouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Dumbbell className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t('noHistory')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workouts.map((workout: WorkoutHistoryEntry) => {
            const setCount: number = workout.workout_sets?.length ?? 0
            const exerciseIds: string[] = [
              ...new Set(workout.workout_sets?.map((set) => set.exercise_id) ?? []),
            ]
            const exerciseNames: string[] = exerciseIds.slice(0, 3).map((id) => {
              const set = workout.workout_sets?.find((item) => item.exercise_id === id)
              const relatedExercises = set?.exercises
              const ex = Array.isArray(relatedExercises) ? relatedExercises[0] : relatedExercises
              if (!ex) return id
              return getExerciseDisplayName(ex, locale as Locale)
            })

            return (
              <div
                key={workout.id}
                className="rounded-2xl border border-border bg-card p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span>
                        {new Date(workout.date).toLocaleDateString(
                          locale === 'zh-TW' ? 'zh-TW' : locale,
                          { year: 'numeric', month: 'long', day: 'numeric' },
                        )}
                      </span>
                    </div>
                    {workout.title && (
                      <p className="text-sm text-foreground font-medium truncate">{workout.title}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0 bg-muted px-2 py-0.5 rounded-full">
                    {setCount} {t('sets')}
                  </span>
                </div>

                {/* Exercise preview */}
                {exerciseNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {exerciseNames.map((name, i) => (
                      <span
                        key={i}
                        className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium"
                      >
                        {name}
                      </span>
                    ))}
                    {exerciseIds.length > 3 && (
                      <span className="text-xs text-muted-foreground px-2 py-0.5">
                        +{exerciseIds.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
