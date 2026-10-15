'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Calendar,
  ChevronDown,
  Trash2,
  FileText,
  Loader2,
  Pencil,
  X,
  CheckCircle2,
  Circle,
  Dumbbell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getExerciseDisplayName,
  getExerciseCalculationType,
  type Exercise,
  type Locale,
  type CalculationType,
} from '@/lib/exercises'
import {
  type WorkoutHistoryEntry,
  type WorkoutHistorySet,
} from '@/lib/actions/workout'
import { formatSecondsToTime, calculatePace } from '@/lib/cardio'
import WorkoutEditForm from './WorkoutEditForm'

export interface ExerciseGroup {
  exerciseId: string
  exerciseName: string
  category: string
  calcType: CalculationType
  sets: WorkoutHistorySet[]
}

export function groupSetsByExercise(
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

      let calcType = getExerciseCalculationType(ex)

      // Intelligent detection from set data if needed
      const hasDistance = sets.some(
        (s) =>
          s.exercise_id === set.exercise_id &&
          s.distance_km != null &&
          Number(s.distance_km) > 0,
      )
      const hasReps = sets.some(
        (s) =>
          s.exercise_id === set.exercise_id &&
          s.reps != null &&
          Number(s.reps) > 0,
      )
      const hasWeight = sets.some(
        (s) =>
          s.exercise_id === set.exercise_id &&
          s.weight_kg != null &&
          Number(s.weight_kg) > 0,
      )
      const hasDuration = sets.some(
        (s) =>
          s.exercise_id === set.exercise_id &&
          s.duration_seconds != null &&
          Number(s.duration_seconds) > 0,
      )

      if (hasDistance && hasDuration) {
        calcType = 'distance_duration'
      } else if (hasReps && hasDuration && !hasDistance) {
        calcType = 'reps_duration'
      } else if (hasDuration && !hasReps && !hasWeight && !hasDistance) {
        calcType = 'duration'
      }

      group = {
        exerciseId: set.exercise_id,
        exerciseName,
        category,
        calcType,
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

export function formatDate(dateStr: string, locale: Locale): string {
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString(locale === 'zh-TW' ? 'zh-TW' : locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

interface WorkoutCardProps {
  workout: WorkoutHistoryEntry
  locale: Locale
  combinedExercises: Exercise[]
  isExpanded: boolean
  onToggleExpand: () => void
  onUpdate: (updated: WorkoutHistoryEntry) => void
  onDelete: (id: string, e: React.MouseEvent) => void
  isDeleting: boolean
  hideDateHeader?: boolean
  indexInDay?: number
}

export default function WorkoutCard({
  workout,
  locale,
  combinedExercises,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  isDeleting,
  hideDateHeader = false,
  indexInDay,
}: WorkoutCardProps) {
  const tHistory = useTranslations('history')
  const tWorkout = useTranslations('workout')
  const [isEditing, setIsEditing] = useState(false)

  const setCount = workout.workout_sets?.length ?? 0
  const exerciseGroups = groupSetsByExercise(workout.workout_sets ?? [], locale)
  const exerciseNames = exerciseGroups.slice(0, 3).map((g) => g.exerciseName)

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card transition-all duration-200 overflow-hidden',
        isEditing
          ? 'ring-2 ring-primary/40 border-primary/50'
          : 'hover:border-primary/50 shadow-sm',
      )}
    >
      {isEditing ? (
        /* Inline Edit Mode */
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                {tWorkout('editWorkout')}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <WorkoutEditForm
            workout={workout}
            exercises={combinedExercises}
            locale={locale}
            onCancel={() => setIsEditing(false)}
            onSuccess={(updated) => {
              onUpdate(updated)
              setIsEditing(false)
            }}
          />
        </div>
      ) : (
        /* Normal Display Mode */
        <>
          {/* Clickable Header */}
          <button
            type="button"
            onClick={onToggleExpand}
            aria-expanded={isExpanded}
            className="w-full text-left p-4 space-y-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0 flex-1">
                {hideDateHeader ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                      <Dumbbell className="h-3 w-3" />
                      {tHistory('workoutNumber', {
                        number: indexInDay != null ? indexInDay + 1 : 1,
                      })}
                    </span>
                    {workout.title && (
                      <span className="text-sm text-foreground font-medium truncate">
                        {workout.title}
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{formatDate(workout.date, locale)}</span>
                    </div>
                    {workout.title && (
                      <p className="text-sm text-foreground/90 font-medium truncate">
                        {workout.title}
                      </p>
                    )}
                  </>
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
                      <h3 className="text-sm font-semibold text-foreground">
                        {group.exerciseName}
                      </h3>
                    </div>

                    {/* Sets list */}
                    <div className="divide-y divide-border/60 text-xs">
                      {/* Table Header */}
                      <div
                        className={cn(
                          'items-center gap-2 px-3.5 py-2 font-medium text-muted-foreground bg-muted/10',
                          group.calcType === 'reps' ||
                            group.calcType === 'duration'
                            ? 'grid grid-cols-[2.5rem_1fr_auto]'
                            : 'grid grid-cols-[2.5rem_1fr_1fr_auto]',
                        )}
                      >
                        <span>#</span>
                        {group.calcType === 'weight_reps' && (
                          <>
                            <span>{tWorkout('weight')}</span>
                            <span>{tWorkout('reps')}</span>
                          </>
                        )}
                        {group.calcType === 'reps' && (
                          <span>{tWorkout('reps')}</span>
                        )}
                        {group.calcType === 'duration' && (
                          <span>{tWorkout('duration')}</span>
                        )}
                        {group.calcType === 'distance_duration' && (
                          <>
                            <span>{tWorkout('distance')}</span>
                            <span>{tWorkout('duration')}</span>
                          </>
                        )}
                        {group.calcType === 'reps_duration' && (
                          <>
                            <span>{tWorkout('reps')}</span>
                            <span>{tWorkout('duration')}</span>
                          </>
                        )}
                        <span className="w-5 text-center"></span>
                      </div>

                      {/* Set Rows */}
                      {group.sets.map((set) => {
                        const pace =
                          group.calcType === 'distance_duration'
                            ? calculatePace(
                                set.distance_km,
                                set.duration_seconds,
                              )
                            : null

                        return (
                          <div
                            key={set.id}
                            className={cn(
                              'items-center gap-2 px-3.5 py-2.5 text-foreground',
                              group.calcType === 'reps' ||
                                group.calcType === 'duration'
                                ? 'grid grid-cols-[2.5rem_1fr_auto]'
                                : 'grid grid-cols-[2.5rem_1fr_1fr_auto]',
                              set.is_completed === false && 'opacity-60',
                            )}
                          >
                            <span className="font-medium text-muted-foreground">
                              {set.set_number}
                            </span>

                            {/* 1. Weight & Reps */}
                            {group.calcType === 'weight_reps' && (
                              <>
                                <span className="font-semibold">
                                  {set.weight_kg ?? 0}{' '}
                                  <span className="font-normal text-muted-foreground text-[11px]">
                                    kg
                                  </span>
                                </span>
                                <span className="font-semibold">
                                  {set.reps ?? 0}{' '}
                                  <span className="font-normal text-muted-foreground text-[11px]">
                                    {tWorkout('reps')}
                                  </span>
                                </span>
                              </>
                            )}

                            {/* 2. Reps Only */}
                            {group.calcType === 'reps' && (
                              <span className="font-semibold">
                                {set.reps ?? 0}{' '}
                                <span className="font-normal text-muted-foreground text-[11px]">
                                  {tWorkout('reps')}
                                </span>
                              </span>
                            )}

                            {/* 3. Duration Only */}
                            {group.calcType === 'duration' && (
                              <span className="font-semibold">
                                {set.duration_seconds != null
                                  ? formatSecondsToTime(set.duration_seconds)
                                  : '-'}
                              </span>
                            )}

                            {/* 4. Distance & Duration */}
                            {group.calcType === 'distance_duration' && (
                              <>
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
                                <div className="flex flex-col">
                                  <span className="font-semibold">
                                    {set.duration_seconds != null
                                      ? formatSecondsToTime(
                                          set.duration_seconds,
                                        )
                                      : '-'}
                                  </span>
                                  {pace && (
                                    <span className="font-normal text-muted-foreground text-[10px]">
                                      {pace}
                                    </span>
                                  )}
                                </div>
                              </>
                            )}

                            {/* 5. Reps & Duration */}
                            {group.calcType === 'reps_duration' && (
                              <>
                                <span className="font-semibold">
                                  {set.reps != null ? (
                                    <>
                                      {set.reps}{' '}
                                      <span className="font-normal text-muted-foreground text-[11px]">
                                        {tWorkout('reps')}
                                      </span>
                                    </>
                                  ) : (
                                    '-'
                                  )}
                                </span>
                                <span className="font-semibold">
                                  {set.duration_seconds != null
                                    ? formatSecondsToTime(
                                        set.duration_seconds,
                                      )
                                    : '-'}
                                </span>
                              </>
                            )}

                            {/* Complete status indicator */}
                            <span className="flex items-center justify-center w-5">
                              {set.is_completed !== false ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground/30" />
                              )}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsEditing(true)
                  }}
                  disabled={isDeleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-foreground hover:bg-muted border border-border transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{tHistory('editWorkout')}</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => onDelete(workout.id, e)}
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
        </>
      )}
    </div>
  )
}
