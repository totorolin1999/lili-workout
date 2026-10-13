'use client'

import { useState, useTransition } from 'react'
import { useForm, useFieldArray, Controller, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getExerciseDisplayName, type Exercise, type Locale } from '@/lib/exercises'
import { updateWorkout, type WorkoutHistoryEntry } from '@/lib/actions/workout'
import { formatSecondsToTime, parseTimeToSeconds, calculatePace } from '@/lib/cardio'

// ─── Types & Schema ──────────────────────────────────────────────────────────

const SetSchema = z.object({
  exercise_id: z.string().optional(),
  set_number: z.number().int().positive(),
  weight_kg: z.coerce.number().min(0).optional().nullable(),
  reps: z.coerce.number().int().min(0).optional().nullable(),
  distance_km: z.coerce.number().min(0).optional().nullable(),
  duration_seconds: z.coerce.number().int().min(0).optional().nullable(),
  duration_text: z.string().optional(),
})

const WorkoutEditFormSchema = z.object({
  date: z.string().min(1, { message: 'dateRequired' }),
  title: z.string().optional(),
  notes: z.string().optional(),
  exerciseGroups: z.array(
    z.object({
      exercise_id: z.string().min(1, { message: 'exerciseRequired' }),
      sets: z.array(SetSchema).min(1),
    }),
  ).min(1),
})

type WorkoutEditFormValues = z.infer<typeof WorkoutEditFormSchema>

interface WorkoutEditFormProps {
  workout: WorkoutHistoryEntry
  exercises: Exercise[]
  locale: Locale
  onCancel: () => void
  onSuccess: (updatedWorkout: WorkoutHistoryEntry) => void
}

function workoutToFormValues(
  workout: WorkoutHistoryEntry,
  exercises: Exercise[],
): WorkoutEditFormValues {
  const map = new Map<string, { exercise_id: string; sets: z.infer<typeof SetSchema>[] }>()
  const groups: { exercise_id: string; sets: z.infer<typeof SetSchema>[] }[] = []

  for (const set of workout.workout_sets ?? []) {
    let group = map.get(set.exercise_id)
    if (!group) {
      group = {
        exercise_id: set.exercise_id,
        sets: [],
      }
      map.set(set.exercise_id, group)
      groups.push(group)
    }

    const ex = exercises.find((e) => e.id === set.exercise_id)
    const isCardio = ex?.category === 'cardio'

    group.sets.push({
      exercise_id: set.exercise_id,
      set_number: set.set_number,
      weight_kg: isCardio ? null : (set.weight_kg ?? 0),
      reps: isCardio ? null : (set.reps ?? 10),
      distance_km: isCardio ? (set.distance_km ?? null) : null,
      duration_seconds: isCardio ? (set.duration_seconds ?? null) : null,
      duration_text: isCardio ? (formatSecondsToTime(set.duration_seconds) ?? '') : '',
    })
  }

  for (const group of groups) {
    group.sets.sort((a, b) => a.set_number - b.set_number)
    group.sets.forEach((s, idx) => {
      s.set_number = idx + 1
    })
  }

  return {
    date: workout.date,
    title: workout.title ?? '',
    notes: workout.notes ?? '',
    exerciseGroups:
      groups.length > 0
        ? groups
        : [
            {
              exercise_id: '',
              sets: [
                {
                  exercise_id: '',
                  set_number: 1,
                  weight_kg: 0,
                  reps: 10,
                  distance_km: null,
                  duration_seconds: null,
                  duration_text: '',
                },
              ],
            },
          ],
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WorkoutEditForm({
  workout,
  exercises,
  locale,
  onCancel,
  onSuccess,
}: WorkoutEditFormProps) {
  const t = useTranslations('workout')
  const tCommon = useTranslations('common')
  const [isPending, startTransition] = useTransition()
  const [saveError, setSaveError] = useState<string | null>(null)

  const form = useForm<WorkoutEditFormValues>({
    resolver: zodResolver(WorkoutEditFormSchema),
    defaultValues: workoutToFormValues(workout, exercises),
  })

  const {
    fields: exerciseGroupFields,
    append: appendGroup,
    remove: removeGroup,
  } = useFieldArray({
    control: form.control,
    name: 'exerciseGroups',
  })

  function addExerciseGroup() {
    setSaveError(null)
    appendGroup({
      exercise_id: '',
      sets: [
        {
          exercise_id: '',
          set_number: 1,
          weight_kg: 0,
          reps: 10,
          distance_km: null,
          duration_seconds: null,
          duration_text: '',
        },
      ],
    })
  }

  function onSubmit(values: WorkoutEditFormValues) {
    setSaveError(null)
    startTransition(async () => {
      const flatSets = values.exerciseGroups.flatMap((group) => {
        const ex = exercises.find((e) => e.id === group.exercise_id)
        const isCardio = ex?.category === 'cardio'

        return group.sets.map((s, idx) => ({
          exercise_id: group.exercise_id,
          set_number: idx + 1,
          weight_kg: isCardio
            ? null
            : s.weight_kg != null && s.weight_kg !== ('' as unknown)
              ? Number(s.weight_kg)
              : 0,
          reps: isCardio
            ? null
            : s.reps != null && s.reps !== ('' as unknown)
              ? Number(s.reps)
              : 0,
          distance_km:
            isCardio && s.distance_km != null && s.distance_km !== ('' as unknown)
              ? Number(s.distance_km)
              : null,
          duration_seconds: isCardio
            ? (s.duration_seconds ?? parseTimeToSeconds(s.duration_text))
            : null,
        }))
      })

      const result = await updateWorkout(workout.id, {
        date: values.date,
        title: values.title?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
        sets: flatSets,
      })

      if (result.error) {
        setSaveError(`${t('errors.saveFailed')}: ${result.error}`)
        return
      }

      if (result.workout) {
        onSuccess(result.workout)
      }
    })
  }

  function onInvalid(errors: FieldErrors<WorkoutEditFormValues>) {
    console.warn('Workout edit form errors:', errors)
    const hasExerciseError = errors.exerciseGroups?.some?.((g) => g?.exercise_id)
    if (hasExerciseError) {
      setSaveError(t('errors.exerciseRequired'))
      return
    }
    const hasRepsError = errors.exerciseGroups?.some?.((g, gIdx) => {
      const selectedId = form.getValues(`exerciseGroups.${gIdx}.exercise_id`)
      const ex = exercises.find((e) => e.id === selectedId)
      if (ex?.category === 'cardio') return false
      return g?.sets?.some?.((s) => s?.reps)
    })
    if (hasRepsError) {
      setSaveError(t('errors.repsRequired'))
      return
    }
    const hasWeightError = errors.exerciseGroups?.some?.((g, gIdx) => {
      const selectedId = form.getValues(`exerciseGroups.${gIdx}.exercise_id`)
      const ex = exercises.find((e) => e.id === selectedId)
      if (ex?.category === 'cardio') return false
      return g?.sets?.some?.((s) => s?.weight_kg)
    })
    if (hasWeightError) {
      setSaveError(t('errors.weightRequired'))
      return
    }
    setSaveError(t('errors.saveFailed'))
  }

  return (
    <div className="space-y-4">
      {/* Date + Title */}
      <div className="space-y-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            {t('workoutDate')}
          </label>
          <input
            type="date"
            {...form.register('date')}
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label={t('workoutDate')}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            {t('workoutTitle')}
          </label>
          <input
            type="text"
            {...form.register('title')}
            placeholder={t('workoutTitle')}
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Exercise Groups */}
      <div className="space-y-3">
        {exerciseGroupFields.map((groupField, groupIdx) => (
          <EditExerciseGroupCard
            key={groupField.id}
            groupIdx={groupIdx}
            form={form}
            exercises={exercises}
            locale={locale}
            t={t}
            tCommon={tCommon}
            onRemoveGroup={() => removeGroup(groupIdx)}
          />
        ))}
      </div>

      {/* Add Exercise button */}
      <button
        type="button"
        onClick={addExerciseGroup}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                   border-2 border-dashed border-border text-xs font-medium text-muted-foreground
                   hover:border-primary hover:text-primary transition-colors"
      >
        <Plus className="h-4 w-4" />
        {t('addExercise')}
      </button>

      {/* Notes */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          {t('workoutNotes')}
        </label>
        <textarea
          {...form.register('notes')}
          placeholder={t('workoutNotes')}
          rows={2}
          className="w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      {/* Save error */}
      {saveError && (
        <p className="text-xs text-destructive text-center">{saveError}</p>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="px-4 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
        >
          {tCommon('cancel')}
        </button>
        <button
          type="button"
          onClick={form.handleSubmit(onSubmit, onInvalid)}
          disabled={isPending || exerciseGroupFields.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{tCommon('save')}...</span>
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              <span>{tCommon('save')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Edit Exercise Group Card ─────────────────────────────────────────────────

interface EditExerciseGroupCardProps {
  groupIdx: number
  form: ReturnType<typeof useForm<WorkoutEditFormValues>>
  exercises: Exercise[]
  locale: Locale
  t: ReturnType<typeof useTranslations<'workout'>>
  tCommon: ReturnType<typeof useTranslations<'common'>>
  onRemoveGroup: () => void
}

function EditExerciseGroupCard({
  groupIdx,
  form,
  exercises,
  locale,
  t,
  tCommon,
  onRemoveGroup,
}: EditExerciseGroupCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const { fields: setFields, append: appendSet, remove: removeSet } = useFieldArray({
    control: form.control,
    name: `exerciseGroups.${groupIdx}.sets`,
  })

  const selectedExerciseId = form.watch(`exerciseGroups.${groupIdx}.exercise_id`)
  const registerExercise = form.register(`exerciseGroups.${groupIdx}.exercise_id`)
  const groupErrors = form.formState.errors.exerciseGroups?.[groupIdx]

  const selectedExercise = exercises.find((ex) => ex.id === selectedExerciseId)
  const isCardio = selectedExercise?.category === 'cardio'

  function addSet() {
    const currentSets = form.getValues(`exerciseGroups.${groupIdx}.sets`) || []
    const lastSet = currentSets[currentSets.length - 1]
    if (isCardio) {
      appendSet({
        exercise_id: selectedExerciseId || '',
        set_number: setFields.length + 1,
        weight_kg: null,
        reps: null,
        distance_km: lastSet?.distance_km ?? null,
        duration_seconds: lastSet?.duration_seconds ?? null,
        duration_text: lastSet?.duration_text ?? '',
      })
    } else {
      appendSet({
        exercise_id: selectedExerciseId || '',
        set_number: setFields.length + 1,
        weight_kg: lastSet?.weight_kg ?? 0,
        reps: lastSet?.reps ?? 10,
        distance_km: null,
        duration_seconds: null,
        duration_text: '',
      })
    }
  }

  return (
    <div className="rounded-xl border border-border/80 bg-card overflow-hidden">
      {/* Group header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b border-border/60">
        <div className="flex-1">
          <select
            {...registerExercise}
            onChange={(e) => {
              registerExercise.onChange(e)
              const newId = e.target.value
              const ex = exercises.find((item) => item.id === newId)
              if (ex?.category === 'cardio') {
                const currentSets = form.getValues(`exerciseGroups.${groupIdx}.sets`) || []
                currentSets.forEach((_, idx) => {
                  form.setValue(`exerciseGroups.${groupIdx}.sets.${idx}.weight_kg`, null)
                  form.setValue(`exerciseGroups.${groupIdx}.sets.${idx}.reps`, null)
                })
              } else {
                const currentSets = form.getValues(`exerciseGroups.${groupIdx}.sets`) || []
                currentSets.forEach((_, idx) => {
                  form.setValue(`exerciseGroups.${groupIdx}.sets.${idx}.distance_km`, null)
                  form.setValue(`exerciseGroups.${groupIdx}.sets.${idx}.duration_seconds`, null)
                  form.setValue(`exerciseGroups.${groupIdx}.sets.${idx}.duration_text`, '')
                })
              }
            }}
            className={cn(
              'w-full bg-transparent text-xs font-semibold text-foreground',
              'focus:outline-none focus:ring-0 border-0 cursor-pointer',
              groupErrors?.exercise_id && 'text-destructive',
            )}
          >
            <option value="" className="bg-card text-foreground dark:bg-zinc-900 dark:text-zinc-100">
              {t('selectExercise')}
            </option>
            {exercises.map((ex) => (
              <option
                key={ex.id}
                value={ex.id}
                className="bg-card text-foreground dark:bg-zinc-900 dark:text-zinc-100"
              >
                {getExerciseDisplayName(ex, locale)}
              </option>
            ))}
          </select>
          {groupErrors?.exercise_id && (
            <p className="text-[11px] text-destructive mt-0.5">{t('errors.exerciseRequired')}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed((p) => !p)}
          className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          aria-label={isCollapsed ? tCommon('expand') : tCommon('collapse')}
        >
          {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={onRemoveGroup}
          className="p-1 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
          aria-label={t('deleteSet')}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Sets */}
      {!isCollapsed && (
        <div className="divide-y divide-border/60">
          {/* Column headers */}
          <div className="grid grid-cols-[2rem_1fr_1fr_auto] gap-2 px-3 py-1.5 text-[11px] font-medium text-muted-foreground bg-muted/10">
            <span className="text-center">#</span>
            <span>{isCardio ? t('distance') : t('weight')}</span>
            <span>{isCardio ? t('duration') : t('reps')}</span>
            <span className="w-6"></span>
          </div>

          {setFields.map((setField, setIdx) => (
            <EditSetRow
              key={setField.id}
              groupIdx={groupIdx}
              setIdx={setIdx}
              isCardio={Boolean(isCardio)}
              form={form}
              t={t}
              onRemove={() => removeSet(setIdx)}
            />
          ))}

          {/* Add set button */}
          <button
            type="button"
            onClick={addSet}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs
                       font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('addSet')}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Edit Set Row ─────────────────────────────────────────────────────────────

interface EditSetRowProps {
  groupIdx: number
  setIdx: number
  isCardio: boolean
  form: ReturnType<typeof useForm<WorkoutEditFormValues>>
  t: ReturnType<typeof useTranslations<'workout'>>
  onRemove: () => void
}

function EditSetRow({ groupIdx, setIdx, isCardio, form, t, onRemove }: EditSetRowProps) {
  const setErrors = form.formState.errors.exerciseGroups?.[groupIdx]?.sets?.[setIdx]

  const distanceKm = form.watch(`exerciseGroups.${groupIdx}.sets.${setIdx}.distance_km`)
  const durationSeconds = form.watch(`exerciseGroups.${groupIdx}.sets.${setIdx}.duration_seconds`)
  const pace = isCardio ? calculatePace(distanceKm, durationSeconds) : null

  return (
    <div>
      <div className="grid grid-cols-[2rem_1fr_1fr_auto] gap-2 px-3 py-2 items-center">
        {/* Set number */}
        <span className="text-xs font-semibold text-muted-foreground text-center">
          {setIdx + 1}
        </span>

        {isCardio ? (
          <>
            {/* Distance (km) */}
            <Controller
              control={form.control}
              name={`exerciseGroups.${groupIdx}.sets.${setIdx}.distance_km`}
              render={({ field }) => (
                <input
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Number(e.target.value)
                    field.onChange(val)
                  }}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0.0"
                  aria-label={t('distance')}
                  className={cn(
                    'w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-center',
                    'focus:outline-none focus:ring-2 focus:ring-primary',
                    setErrors?.distance_km && 'border-destructive focus:ring-destructive',
                  )}
                />
              )}
            />

            {/* Duration */}
            <Controller
              control={form.control}
              name={`exerciseGroups.${groupIdx}.sets.${setIdx}.duration_text`}
              render={({ field }) => (
                <input
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const text = e.target.value
                    field.onChange(text)
                    const seconds = parseTimeToSeconds(text)
                    form.setValue(
                      `exerciseGroups.${groupIdx}.sets.${setIdx}.duration_seconds`,
                      seconds,
                    )
                  }}
                  onBlur={(e) => {
                    const seconds = parseTimeToSeconds(e.target.value)
                    if (seconds != null) {
                      field.onChange(formatSecondsToTime(seconds))
                      form.setValue(
                        `exerciseGroups.${groupIdx}.sets.${setIdx}.duration_seconds`,
                        seconds,
                      )
                    }
                  }}
                  type="text"
                  placeholder={t('durationPlaceholder')}
                  aria-label={t('duration')}
                  className={cn(
                    'w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-center',
                    'focus:outline-none focus:ring-2 focus:ring-primary',
                    setErrors?.duration_seconds && 'border-destructive focus:ring-destructive',
                  )}
                />
              )}
            />
          </>
        ) : (
          <>
            {/* Weight */}
            <Controller
              control={form.control}
              name={`exerciseGroups.${groupIdx}.sets.${setIdx}.weight_kg`}
              render={({ field }) => (
                <input
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Number(e.target.value)
                    field.onChange(val)
                  }}
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0"
                  placeholder="0"
                  aria-label={t('weight')}
                  className={cn(
                    'w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-center',
                    'focus:outline-none focus:ring-2 focus:ring-primary',
                    setErrors?.weight_kg && 'border-destructive focus:ring-destructive',
                  )}
                />
              )}
            />

            {/* Reps */}
            <Controller
              control={form.control}
              name={`exerciseGroups.${groupIdx}.sets.${setIdx}.reps`}
              render={({ field }) => (
                <input
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Number(e.target.value)
                    field.onChange(val)
                  }}
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="1"
                  placeholder="0"
                  aria-label={t('reps')}
                  className={cn(
                    'w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-center',
                    'focus:outline-none focus:ring-2 focus:ring-primary',
                    setErrors?.reps && 'border-destructive focus:ring-destructive',
                  )}
                />
              )}
            />
          </>
        )}

        {/* Delete */}
        <button
          type="button"
          onClick={onRemove}
          aria-label={t('deleteSet')}
          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Live calculated pace display */}
      {isCardio && pace && (
        <div className="px-10 pb-1.5 text-[10px] text-muted-foreground flex items-center gap-1.5 font-medium">
          <span className="text-primary">{t('pace')}:</span>
          <span className="text-foreground font-semibold">{pace}</span>
        </div>
      )}
    </div>
  )
}
