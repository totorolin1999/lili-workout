'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import {
  Calendar,
  Dumbbell,
  ChevronDown,
  Trash2,
  FileText,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getExerciseDisplayName, type Locale } from '@/lib/exercises'
import {
  deleteWorkout,
  type WorkoutHistoryEntry,
  type WorkoutHistorySet,
} from '@/lib/actions/workout'
import { formatSecondsToTime, calculatePace } from '@/lib/cardio'

interface WorkoutHistoryListProps {
  initialWorkouts: WorkoutHistoryEntry[]
  locale: Locale
}

interface ExerciseGroup {
  exerciseId: string
  exerciseName: string
  category: string
  sets: WorkoutHistorySet[]
}

function groupSetsByExercise(
  sets: WorkoutHistorySet[],
  locale: Locale,
): ExerciseGroup[] {
  const groups: ExerciseGroup[] = []
  const map = new Map<string, ExerciseGroup>()

  for (const set of sets) {
    let group = map.get(set.exercise_id)
    if (!group) {
      const related = set.exercises
      const ex = Array.isArray(related) ? related[0] : related
      const exerciseName = ex
        ? getExerciseDisplayName(ex, locale)
        : set.exercise_id
      const category = ex?.category ?? 'other'
      group = {
        exerciseId: set.exercise_id,
        exerciseName,
        category,
        sets: [],
      }
      map.set(set.exercise_id, group)
      groups.push(group)
    }
    group.sets.push(set)
  }

  for (const group of groups) {
    group.sets.sort((a, b) => a.set_number - b.set_number)
  }

  return groups
}

function formatDate(dateStr: string, locale: Locale): string {
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString(locale === 'zh-TW' ? 'zh-TW' : locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function WorkoutHistoryList({
  initialWorkouts,
  locale,
}: WorkoutHistoryListProps) {
  const tHistory = useTranslations('history')
  const tWorkout = useTranslations('workout')
  const [workouts, setWorkouts] = useState(initialWorkouts)
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function toggleExpand(id: string) {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(tHistory('confirmDelete'))) return

    setDeletingId(id)
    startTransition(async () => {
      const result = await deleteWorkout(id)
      setDeletingId(null)
      if (result.error) {
        alert(result.error)
        return
      }
      setWorkouts((prev) => prev.filter((w) => w.id !== id))
    })
  }

  if (workouts.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-foreground">{tHistory('title')}</h1>
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Dumbbell className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{tHistory('noHistory')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">{tHistory('title')}</h1>

      <div className="space-y-3">
        {workouts.map((workout) => {
          const isExpanded = !!expandedIds[workout.id]
          const isDeleting = deletingId === workout.id
          const setCount = workout.workout_sets?.length ?? 0
          const exerciseGroups = groupSetsByExercise(
            workout.workout_sets ?? [],
            locale,
          )

          const exerciseNames = exerciseGroups
            .slice(0, 3)
            .map((g) => g.exerciseName)

          return (
            <div
              key={workout.id}
              className={cn(
                'rounded-2xl border border-border bg-card transition-all duration-200 overflow-hidden',
                'hover:border-primary/50 shadow-sm',
              )}
            >
              {/* Clickable Header */}
              <button
                type="button"
                onClick={() => toggleExpand(workout.id)}
                aria-expanded={isExpanded}
                className="w-full text-left p-4 space-y-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{formatDate(workout.date, locale)}</span>
                    </div>
                    {workout.title && (
                      <p className="text-sm text-foreground/90 font-medium truncate">
                        {workout.title}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full font-medium">
                      {setCount} {tHistory('sets')}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-muted-foreground transition-transform duration-200',
                        isExpanded && 'rotate-180 text-primary',
                      )}
                    />
                  </div>
                </div>

                {/* Exercise preview pills */}
                {exerciseNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {exerciseNames.map((name, i) => (
                      <span
                        key={i}
                        className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium"
                      >
                        {name}
                      </span>
                    ))}
                    {exerciseGroups.length > 3 && (
                      <span className="text-xs text-muted-foreground px-2 py-0.5">
                        +{exerciseGroups.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-border px-4 py-4 space-y-4 bg-muted/10">
                  {/* Workout Notes */}
                  {workout.notes && (
                    <div className="flex items-start gap-2 p-3 bg-muted/40 rounded-xl text-xs text-muted-foreground">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="space-y-0.5">
                        <span className="font-semibold text-foreground">
                          {tWorkout('notes')}:
                        </span>
                        <p className="whitespace-pre-wrap">{workout.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Exercise Groups */}
                  <div className="space-y-3">
                    {exerciseGroups.map((group) => (
                      <div
                        key={group.exerciseId}
                        className="rounded-xl border border-border/80 bg-card overflow-hidden"
                      >
                        {/* Exercise Name Header */}
                        <div className="px-3.5 py-2 bg-muted/30 border-b border-border/60">
                          <h2 className="text-sm font-semibold text-foreground">
                            {group.exerciseName}
                          </h2>
                        </div>

                        {/* Sets list */}
                        <div className="divide-y divide-border/60 text-xs">
                          {/* Table Header */}
                          <div className="grid grid-cols-[2.5rem_1fr_1fr] items-center gap-2 px-3.5 py-2 font-medium text-muted-foreground bg-muted/10">
                            <span>#</span>
                            <span>{group.category === 'cardio' ? tWorkout('distance') : tWorkout('weight')}</span>
                            <span>{group.category === 'cardio' ? tWorkout('duration') : tWorkout('reps')}</span>
                          </div>

                          {/* Set Rows */}
                          {group.sets.map((set) => {
                            const isCardio = group.category === 'cardio'
                            const pace = isCardio ? calculatePace(set.distance_km, set.duration_seconds) : null

                            return (
                              <div
                                key={set.id}
                                className="grid grid-cols-[2.5rem_1fr_1fr] items-center gap-2 px-3.5 py-2.5 text-foreground"
                              >
                                <span className="font-medium text-muted-foreground">
                                  {set.set_number}
                                </span>
                                {isCardio ? (
                                  <span className="font-semibold">
                                    {set.distance_km != null ? (
                                      <>
                                        {set.distance_km}{' '}
                                        <span className="font-normal text-muted-foreground text-[11px]">
                                          km
                                        </span>
                                      </>
                                    ) : (
                                      '-'
                                    )}
                                  </span>
                                ) : (
                                  <span className="font-semibold">
                                    {set.weight_kg}{' '}
                                    <span className="font-normal text-muted-foreground text-[11px]">
                                      kg
                                    </span>
                                  </span>
                                )}
                                {isCardio ? (
                                  <div className="flex flex-col">
                                    <span className="font-semibold">
                                      {set.duration_seconds != null
                                        ? formatSecondsToTime(set.duration_seconds)
                                        : '-'}
                                    </span>
                                    {pace && (
                                      <span className="font-normal text-muted-foreground text-[10px]">
                                        {pace}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="font-semibold">
                                    {set.reps}{' '}
                                    <span className="font-normal text-muted-foreground text-[11px]">
                                      {tWorkout('reps')}
                                    </span>
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="button"
                      onClick={(e) => handleDelete(workout.id, e)}
                      disabled={isDeleting}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium',
                        'text-destructive hover:bg-destructive/10 border border-destructive/20 transition-colors',
                        isDeleting && 'opacity-60 cursor-not-allowed',
                      )}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      <span>{tHistory('deleteWorkout')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
