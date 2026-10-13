'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useForm, useFieldArray, Controller, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations, useLocale } from 'next-intl'
import {
  Plus, Trash2, ChevronDown, ChevronUp, Save
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getExerciseDisplayName, type Exercise, type Locale } from '@/lib/exercises'
import { saveWorkout, getLastSetForExercise } from '@/lib/actions/workout'
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
  is_completed: z.boolean(),
})

const WorkoutFormSchema = z.object({
  date: z.string().optional(),
  title: z.string().optional(),
  notes: z.string().optional(),
  exerciseGroups: z.array(
    z.object({
      exercise_id: z.string().min(1, { message: 'exerciseRequired' }),
      sets: z.array(SetSchema).min(1),
    }),
  ).min(1),
})

type WorkoutFormValues = z.infer<typeof WorkoutFormSchema>

interface WorkoutLoggerProps {
  exercises: Exercise[]
}

interface LastSession {
  weight_kg?: number | null
  reps?: number | null
  distance_km?: number | null
  duration_seconds?: number | null
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WorkoutLogger({ exercises }: WorkoutLoggerProps) {
  const t = useTranslations('workout')
  const tCommon = useTranslations('common')
  const locale = useLocale() as Locale
  const [isPending, startTransition] = useTransition()
  const [lastSessions, setLastSessions] = useState<Record<string, LastSession | null>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [today, setToday] = useState('')

  const form = useForm<WorkoutFormValues>({
    resolver: zodResolver(WorkoutFormSchema),
    defaultValues: {
      date: '',
      title: '',
      notes: '',
      exerciseGroups: [],
    },
  })

  useEffect(() => {
    const currentDate = new Date().toISOString().slice(0, 10)
    setToday(currentDate)
    form.setValue('date', currentDate, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    })
  }, [form])

  const { fields: exerciseGroupFields, append: appendGroup, remove: removeGroup } = useFieldArray({
    control: form.control,
    name: 'exerciseGroups',
  })

  // ─── Fetch last session when exercise selected ────────────────────────────

  const fetchLastSession = useCallback(async (exerciseId: string) => {
    if (!exerciseId || lastSessions[exerciseId] !== undefined) return
    const result = await getLastSetForExercise(exerciseId)
    setLastSessions((prev) => ({ ...prev, [exerciseId]: result }))
  }, [lastSessions])

  // ─── Add exercise group ───────────────────────────────────────────────────

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
          is_completed: true,
        },
      ],
    })
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  function onSubmit(values: WorkoutFormValues) {
    setSaveError(null)
    startTransition(async () => {
      const flatSets = values.exerciseGroups.flatMap((group) => {
        const ex = exercises.find((e) => e.id === group.exercise_id)
        const isCardio = ex?.category === 'cardio'

        return group.sets.map((s) => ({
          exercise_id: group.exercise_id,
          set_number: s.set_number,
          weight_kg: isCardio ? 0 : Number(s.weight_kg ?? 0),
          reps: isCardio ? 0 : Number(s.reps ?? 0),
          distance_km:
            isCardio && s.distance_km != null && s.distance_km !== ('' as unknown)
              ? Number(s.distance_km)
              : null,
          duration_seconds: isCardio
            ? (s.duration_seconds ?? parseTimeToSeconds(s.duration_text))
            : null,
          is_completed: true,
        }))
      })

      const result = await saveWorkout({
        date: values.date || today || new Date().toISOString().slice(0, 10),
        title: values.title || undefined,
        notes: values.notes || undefined,
        sets: flatSets,
      })

      if ('error' in result) {
        setSaveError(`${t('errors.saveFailed')}: ${result.error}`)
      } else {
        setSaved(true)
        form.reset({ date: today, title: '', notes: '', exerciseGroups: [] })
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  function onInvalid(errors: FieldErrors<WorkoutFormValues>) {
    console.warn('Workout form validation errors:', errors)
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

  const watchedGroups = form.watch('exerciseGroups')

  return (
    <div className="space-y-4 pb-28">
      {/* Date + Title */}
      <div className="space-y-2">
        <input
          type="date"
          {...form.register('date')}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm
                     focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label={t('workoutDate')}
        />
        <input
          type="text"
          {...form.register('title')}
          placeholder={t('workoutTitle')}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm
                     focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Exercise Groups */}
      {exerciseGroupFields.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">{t('noExercises')}</p>
      ) : (
        <div className="space-y-4">
          {exerciseGroupFields.map((groupField, groupIdx) => (
            <ExerciseGroupCard
              key={groupField.id}
              groupIdx={groupIdx}
              form={form}
              exercises={exercises}
              locale={locale}
              t={t}
              tCommon={tCommon}
              lastSession={lastSessions[watchedGroups[groupIdx]?.exercise_id] ?? null}
              onExerciseChange={(id) => fetchLastSession(id)}
              onRemoveGroup={() => removeGroup(groupIdx)}
            />
          ))}
        </div>
      )}

      {/* Add Exercise button */}
      <button
        type="button"
        onClick={addExerciseGroup}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                   border-2 border-dashed border-border text-sm font-medium text-muted-foreground
                   hover:border-primary hover:text-primary transition-colors"
      >
        <Plus className="h-4 w-4" />
        {t('addExercise')}
      </button>

      {/* Notes */}
      <textarea
        {...form.register('notes')}
        placeholder={t('workoutNotes')}
        rows={2}
        className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm
                   focus:outline-none focus:ring-2 focus:ring-primary resize-none"
      />

      {/* Save error */}
      {saveError && (
        <p className="text-sm text-destructive text-center">{saveError}</p>
      )}
      {saved && (
        <p className="text-sm text-green-600 text-center font-medium">{t('workoutSaved')}</p>
      )}

      {/* Save button */}
      <button
        type="button"
        onClick={form.handleSubmit(onSubmit, onInvalid)}
        disabled={isPending || exerciseGroupFields.length === 0}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl
                   bg-primary text-primary-foreground font-semibold text-base
                   disabled:opacity-50 disabled:cursor-not-allowed
                   hover:bg-primary/90 transition-colors active:scale-[0.98]"
      >
        <Save className="h-5 w-5" />
        {isPending ? t('saveWorkout') + '...' : t('finishWorkout')}
      </button>
    </div>
  )
}

// ─── Exercise Group Card ──────────────────────────────────────────────────────

interface ExerciseGroupCardProps {
  groupIdx: number
  form: ReturnType<typeof useForm<WorkoutFormValues>>
  exercises: Exercise[]
  locale: Locale
  t: ReturnType<typeof useTranslations<'workout'>>
  tCommon: ReturnType<typeof useTranslations<'common'>>
  lastSession: LastSession | null
  onExerciseChange: (id: string) => void
  onRemoveGroup: () => void
}

function ExerciseGroupCard({
  groupIdx, form, exercises, locale, t, tCommon, lastSession,
  onExerciseChange, onRemoveGroup,
}: ExerciseGroupCardProps) {
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
        weight_kg: 0,
        reps: 0,
        distance_km: lastSet?.distance_km ?? lastSession?.distance_km ?? null,
        duration_seconds: lastSet?.duration_seconds ?? lastSession?.duration_seconds ?? null,
        duration_text: lastSet?.duration_text ?? formatSecondsToTime(lastSession?.duration_seconds) ?? '',
        is_completed: true,
      })
    } else {
      appendSet({
        exercise_id: selectedExerciseId || '',
        set_number: setFields.length + 1,
        weight_kg: lastSet?.weight_kg ?? lastSession?.weight_kg ?? 0,
        reps: lastSet?.reps ?? lastSession?.reps ?? 10,
        distance_km: null,
        duration_seconds: null,
        duration_text: '',
        is_completed: true,
      })
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Group header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/40">
        <div className="flex-1">
          <select
            {...registerExercise}
            onChange={(e) => {
              registerExercise.onChange(e)
              const newId = e.target.value
              onExerciseChange(newId)
              const ex = exercises.find((item) => item.id === newId)
              if (ex?.category === 'cardio') {
                const currentSets = form.getValues(`exerciseGroups.${groupIdx}.sets`) || []
                currentSets.forEach((s, idx) => {
                  if (s.reps === 10 && (s.weight_kg === 0 || !s.weight_kg)) {
                    form.setValue(`exerciseGroups.${groupIdx}.sets.${idx}.reps`, 0)
                  }
                })
              }
            }}
            className={cn(
              'w-full bg-transparent text-sm font-medium text-foreground',
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
            <p className="text-xs text-destructive mt-0.5">{t('errors.exerciseRequired')}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed((p) => !p)}
          className="p-1 rounded-lg hover:bg-muted transition-colors"
          aria-label={isCollapsed ? tCommon('expand') : tCommon('collapse')}
        >
          {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onRemoveGroup}
          className="p-1 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
          aria-label={t('deleteSet')}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Last session hint */}
      {lastSession && !isCollapsed && (
        <div className="px-4 py-1.5 text-xs text-muted-foreground bg-primary/5 border-b border-border">
          {isCardio ? (
            <>
              {t('lastSession')}: {lastSession.distance_km != null ? `${lastSession.distance_km} km` : ''}
              {lastSession.distance_km != null && lastSession.duration_seconds != null ? ' • ' : ''}
              {lastSession.duration_seconds != null ? formatSecondsToTime(lastSession.duration_seconds) : ''}
              {calculatePace(lastSession.distance_km, lastSession.duration_seconds)
                ? ` (${calculatePace(lastSession.distance_km, lastSession.duration_seconds)})`
                : ''}
            </>
          ) : (
            <>
              {t('lastSession')}: {lastSession.weight_kg ?? 0}kg × {lastSession.reps ?? 0} {t('reps')}
            </>
          )}
        </div>
      )}

      {/* Sets */}
      {!isCollapsed && (
        <div className="divide-y divide-border">
          {/* Column headers */}
          <div className="grid grid-cols-[2rem_1fr_1fr_auto] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground">
            <span>#</span>
            <span>{isCardio ? t('distance') : t('weight')}</span>
            <span>{isCardio ? t('duration') : t('reps')}</span>
            <span></span>
          </div>

          {setFields.map((setField, setIdx) => (
            <SetRow
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
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs
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

// ─── Set Row ─────────────────────────────────────────────────────────────────

interface SetRowProps {
  groupIdx: number
  setIdx: number
  isCardio: boolean
  form: ReturnType<typeof useForm<WorkoutFormValues>>
  t: ReturnType<typeof useTranslations<'workout'>>
  onRemove: () => void
}

function SetRow({ groupIdx, setIdx, isCardio, form, t, onRemove }: SetRowProps) {
  const setErrors = form.formState.errors.exerciseGroups?.[groupIdx]?.sets?.[setIdx]

  const distanceKm = form.watch(`exerciseGroups.${groupIdx}.sets.${setIdx}.distance_km`)
  const durationSeconds = form.watch(`exerciseGroups.${groupIdx}.sets.${setIdx}.duration_seconds`)
  const pace = isCardio ? calculatePace(distanceKm, durationSeconds) : null

  return (
    <div>
      <div className="grid grid-cols-[2rem_1fr_1fr_auto] gap-2 px-4 py-2 items-center">
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
                    'w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-center',
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
                    'w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-center',
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
                    'w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-center',
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
                    'w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-center',
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
        <div className="px-12 pb-2 text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
          <span className="text-primary">{t('pace')}:</span>
          <span className="text-foreground font-semibold">{pace}</span>
        </div>
      )}
    </div>
  )
}
