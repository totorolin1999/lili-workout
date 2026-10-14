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
import {
  getExerciseDisplayName,
  getExerciseCalculationType,
  CALCULATION_TYPES,
  type Exercise,
  type Locale,
  type CalculationType,
} from '@/lib/exercises'
import { updateWorkout, type WorkoutHistoryEntry } from '@/lib/actions/workout'
import { formatSecondsToTime, parseTimeToSeconds, calculatePace } from '@/lib/cardio'
import ExerciseSelectorModal from './ExerciseSelectorModal'

// ─── Types & Schema ──────────────────────────────────────────────────────────

const CATEGORIES = ['legs', 'chest', 'back', 'shoulders', 'arms', 'core', 'cardio', 'other'] as const
type Category = (typeof CATEGORIES)[number]

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
      calculation_type: z.enum(CALCULATION_TYPES as unknown as [CalculationType, ...CalculationType[]]).optional(),
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
  const map = new Map<string, { exercise_id: string; calculation_type: CalculationType; sets: z.infer<typeof SetSchema>[] }>()
  const groups: { exercise_id: string; calculation_type: CalculationType; sets: z.infer<typeof SetSchema>[] }[] = []

  for (const set of workout.workout_sets ?? []) {
    let group = map.get(set.exercise_id)
    if (!group) {
      const ex = exercises.find((e) => e.id === set.exercise_id)
      let calcType = getExerciseCalculationType(ex)

      // Intelligent detection if set data has reps + duration (like Jump rope) or pure duration (Plank)
      if (set.reps != null && set.duration_seconds != null && (!set.distance_km || set.distance_km === 0)) {
        calcType = 'reps_duration'
      } else if (set.duration_seconds != null && set.reps == null && set.weight_kg == null && !set.distance_km) {
        calcType = 'duration'
      }

      group = {
        exercise_id: set.exercise_id,
        calculation_type: calcType,
        sets: [],
      }
      map.set(set.exercise_id, group)
      groups.push(group)
    }

    const calcType = group.calculation_type

    group.sets.push({
      exercise_id: set.exercise_id,
      set_number: set.set_number,
      weight_kg: calcType === 'weight_reps' ? (set.weight_kg ?? 0) : null,
      reps: calcType === 'weight_reps' || calcType === 'reps' || calcType === 'reps_duration' ? (set.reps ?? 10) : null,
      distance_km: calcType === 'distance_duration' ? (set.distance_km ?? null) : null,
      duration_seconds: calcType === 'duration' || calcType === 'distance_duration' || calcType === 'reps_duration' ? (set.duration_seconds ?? null) : null,
      duration_text:
        calcType === 'duration' || calcType === 'distance_duration' || calcType === 'reps_duration'
          ? (formatSecondsToTime(set.duration_seconds) ?? '')
          : '',
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
              calculation_type: 'weight_reps',
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
  const tEx = useTranslations('exercises')
  const tCommon = useTranslations('common')
  const [isPending, startTransition] = useTransition()
  const [saveError, setSaveError] = useState<string | null>(null)

  // Picker modal state
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [pickerTargetGroupIdx, setPickerTargetGroupIdx] = useState<number | 'new' | null>(null)

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

  function handleOpenNewGroupPicker() {
    setSaveError(null)
    setPickerTargetGroupIdx('new')
    setIsPickerOpen(true)
  }

  function handleOpenGroupPicker(groupIdx: number) {
    setSaveError(null)
    setPickerTargetGroupIdx(groupIdx)
    setIsPickerOpen(true)
  }

  function handleSelectExercise(selectedEx: Exercise) {
    const calcType = getExerciseCalculationType(selectedEx)

    if (pickerTargetGroupIdx === 'new') {
      appendGroup({
        exercise_id: selectedEx.id,
        calculation_type: calcType,
        sets: [
          {
            exercise_id: selectedEx.id,
            set_number: 1,
            weight_kg: calcType === 'weight_reps' ? 0 : null,
            reps: calcType === 'duration' || calcType === 'distance_duration' ? null : 10,
            distance_km: null,
            duration_seconds: null,
            duration_text: '',
          },
        ],
      })
    } else if (typeof pickerTargetGroupIdx === 'number') {
      const idx = pickerTargetGroupIdx
      form.setValue(`exerciseGroups.${idx}.exercise_id`, selectedEx.id, { shouldValidate: true })
      form.setValue(`exerciseGroups.${idx}.calculation_type`, calcType)
    }

    setIsPickerOpen(false)
    setPickerTargetGroupIdx(null)
  }

  function onSubmit(values: WorkoutEditFormValues) {
    setSaveError(null)
    startTransition(async () => {
      const flatSets = values.exerciseGroups.flatMap((group) => {
        const ex = exercises.find((e) => e.id === group.exercise_id)
        const calcType = group.calculation_type ?? getExerciseCalculationType(ex)

        return group.sets.map((s) => {
          let weight_kg: number | null = null
          let reps: number | null = null
          let distance_km: number | null = null
          let duration_seconds: number | null = null

          if (calcType === 'weight_reps') {
            weight_kg = s.weight_kg != null && s.weight_kg !== ('' as unknown) ? Number(s.weight_kg) : 0
            reps = s.reps != null && s.reps !== ('' as unknown) ? Number(s.reps) : 0
          } else if (calcType === 'reps') {
            reps = s.reps != null && s.reps !== ('' as unknown) ? Number(s.reps) : 0
          } else if (calcType === 'duration') {
            duration_seconds = s.duration_seconds ?? parseTimeToSeconds(s.duration_text)
          } else if (calcType === 'distance_duration') {
            distance_km = s.distance_km != null && s.distance_km !== ('' as unknown) ? Number(s.distance_km) : null
            duration_seconds = s.duration_seconds ?? parseTimeToSeconds(s.duration_text)
          } else if (calcType === 'reps_duration') {
            reps = s.reps != null && s.reps !== ('' as unknown) ? Number(s.reps) : null
            duration_seconds = s.duration_seconds ?? parseTimeToSeconds(s.duration_text)
          }

          return {
            exercise_id: group.exercise_id,
            set_number: s.set_number,
            weight_kg,
            reps,
            distance_km,
            duration_seconds,
          }
        })
      })

      const result = await updateWorkout(workout.id, {
        date: values.date,
        title: values.title || undefined,
        notes: values.notes || undefined,
        sets: flatSets,
      })

      if (result.error || !result.workout) {
        setSaveError(`${t('errors.saveFailed')}: ${result.error ?? ''}`)
      } else {
        onSuccess(result.workout)
      }
    })
  }

  function onInvalid(errors: FieldErrors<WorkoutEditFormValues>) {
    console.warn('Edit workout form validation errors:', errors)
    const hasExerciseError = errors.exerciseGroups?.some?.((g) => g?.exercise_id)
    if (hasExerciseError) {
      setSaveError(t('errors.exerciseRequired'))
      return
    }

    const hasRepsError = errors.exerciseGroups?.some?.((g, gIdx) => {
      const selectedId = form.getValues(`exerciseGroups.${gIdx}.exercise_id`)
      const ex = exercises.find((e) => e.id === selectedId)
      const calcType = form.getValues(`exerciseGroups.${gIdx}.calculation_type`) ?? getExerciseCalculationType(ex)
      if (calcType === 'duration' || calcType === 'distance_duration') return false
      return g?.sets?.some?.((s) => s?.reps)
    })
    if (hasRepsError) {
      setSaveError(t('errors.repsRequired'))
      return
    }

    const hasWeightError = errors.exerciseGroups?.some?.((g, gIdx) => {
      const selectedId = form.getValues(`exerciseGroups.${gIdx}.exercise_id`)
      const ex = exercises.find((e) => e.id === selectedId)
      const calcType = form.getValues(`exerciseGroups.${gIdx}.calculation_type`) ?? getExerciseCalculationType(ex)
      if (calcType !== 'weight_reps') return false
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
    <div className="space-y-4">
      {/* Date & Title */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground block">
          {t('workoutDate')}
        </label>
        <input
          type="date"
          {...form.register('date')}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-primary"
        />

        <input
          type="text"
          {...form.register('title')}
          placeholder={t('workoutTitle')}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Exercise Groups */}
      <div className="space-y-3">
        {exerciseGroupFields.map((groupField, groupIdx) => (
          <ExerciseGroupCard
            key={groupField.id}
            groupIdx={groupIdx}
            form={form}
            exercises={exercises}
            locale={locale}
            t={t}
            tEx={tEx}
            tCommon={tCommon}
            onOpenPicker={() => handleOpenGroupPicker(groupIdx)}
            onRemoveGroup={() => removeGroup(groupIdx)}
          />
        ))}
      </div>

      {/* Add Exercise */}
      <button
        type="button"
        onClick={handleOpenNewGroupPicker}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                   border border-dashed border-border text-xs font-medium text-foreground
                   hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
      >
        <Plus className="h-4 w-4" />
        {t('addExercise')}
      </button>

      {/* Notes */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground block">
          {t('notes')}
        </label>
        <textarea
          {...form.register('notes')}
          rows={2}
          placeholder={t('workoutNotes')}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      {/* Errors */}
      {saveError && (
        <p className="text-xs text-destructive text-center">{saveError}</p>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="flex-1 py-2.5 rounded-xl border border-border bg-muted/50 text-foreground text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          {tCommon('cancel')}
        </button>
        <button
          type="button"
          onClick={form.handleSubmit(onSubmit, onInvalid)}
          disabled={isPending}
          className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('saveWorkout')}...
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              {t('saveWorkout')}
            </>
          )}
        </button>
      </div>

      {/* Categorized Exercise Selection Modal */}
      <ExerciseSelectorModal
        isOpen={isPickerOpen}
        onClose={() => {
          setIsPickerOpen(false)
          setPickerTargetGroupIdx(null)
        }}
        onSelect={handleSelectExercise}
        exercises={exercises}
        selectedExerciseId={
          typeof pickerTargetGroupIdx === 'number'
            ? watchedGroups[pickerTargetGroupIdx]?.exercise_id
            : undefined
        }
        locale={locale}
      />
    </div>
  )
}

// ─── Exercise Group Card ──────────────────────────────────────────────────────

interface ExerciseGroupCardProps {
  groupIdx: number
  form: ReturnType<typeof useForm<WorkoutEditFormValues>>
  exercises: Exercise[]
  locale: Locale
  t: ReturnType<typeof useTranslations<'workout'>>
  tEx: ReturnType<typeof useTranslations<'exercises'>>
  tCommon: ReturnType<typeof useTranslations<'common'>>
  onOpenPicker: () => void
  onRemoveGroup: () => void
}

function ExerciseGroupCard({
  groupIdx,
  form,
  exercises,
  locale,
  t,
  tEx,
  tCommon,
  onOpenPicker,
  onRemoveGroup,
}: ExerciseGroupCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const {
    fields: setFields,
    append: appendSet,
    remove: removeSet,
  } = useFieldArray({
    control: form.control,
    name: `exerciseGroups.${groupIdx}.sets`,
  })

  const selectedExerciseId = form.watch(`exerciseGroups.${groupIdx}.exercise_id`)
  const currentCalcType = form.watch(`exerciseGroups.${groupIdx}.calculation_type`)
  const registerExercise = form.register(`exerciseGroups.${groupIdx}.exercise_id`)
  const groupErrors = form.formState.errors.exerciseGroups?.[groupIdx]

  const selectedExercise = exercises.find((ex) => ex.id === selectedExerciseId)
  const calcType = currentCalcType ?? getExerciseCalculationType(selectedExercise)

  const calcTypeLabel: Record<CalculationType, string> = {
    weight_reps: t('calculationType.weight_reps'),
    reps: t('calculationType.reps'),
    duration: t('calculationType.duration'),
    distance_duration: t('calculationType.distance_duration'),
    reps_duration: t('calculationType.reps_duration'),
  }

  const categoryLabel: Record<Category, string> = {
    legs: tEx('categories.legs'),
    chest: tEx('categories.chest'),
    back: tEx('categories.back'),
    shoulders: tEx('categories.shoulders'),
    arms: tEx('categories.arms'),
    core: tEx('categories.core'),
    cardio: tEx('categories.cardio'),
    other: tEx('categories.other'),
  }

  const groupedExercises = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    const cat = ex.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(ex)
    return acc
  }, {})

  function addSet() {
    const currentSets = form.getValues(`exerciseGroups.${groupIdx}.sets`) || []
    const lastSet = currentSets[currentSets.length - 1]

    appendSet({
      exercise_id: selectedExerciseId || '',
      set_number: setFields.length + 1,
      weight_kg: calcType === 'weight_reps' ? (lastSet?.weight_kg ?? 0) : null,
      reps: calcType === 'weight_reps' || calcType === 'reps' || calcType === 'reps_duration' ? (lastSet?.reps ?? 10) : null,
      distance_km: calcType === 'distance_duration' ? (lastSet?.distance_km ?? null) : null,
      duration_seconds:
        calcType === 'duration' || calcType === 'distance_duration' || calcType === 'reps_duration'
          ? (lastSet?.duration_seconds ?? null)
          : null,
      duration_text:
        calcType === 'duration' || calcType === 'distance_duration' || calcType === 'reps_duration'
          ? (lastSet?.duration_text ?? '')
          : '',
    })
  }

  function handleCalcTypeChange(newType: CalculationType) {
    form.setValue(`exerciseGroups.${groupIdx}.calculation_type`, newType)
  }

  return (
    <div className="rounded-xl border border-border/80 bg-card overflow-hidden">
      {/* Group header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b border-border/60">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onOpenPicker}
              className="text-left font-semibold text-xs text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
            >
              <span className={cn(!selectedExercise && 'text-muted-foreground')}>
                {selectedExercise ? getExerciseDisplayName(selectedExercise, locale) : t('selectExercise')}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>

            <select
              value={calcType}
              onChange={(e) => handleCalcTypeChange(e.target.value as CalculationType)}
              className="text-[10px] font-medium bg-muted/80 text-foreground px-1.5 py-0.5 rounded border border-border/60 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
              title={t('calculationType.label')}
            >
              {CALCULATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {calcTypeLabel[type]}
                </option>
              ))}
            </select>
          </div>

          <select
            {...registerExercise}
            onChange={(e) => {
              registerExercise.onChange(e)
              const newId = e.target.value
              const ex = exercises.find((item) => item.id === newId)
              if (ex) {
                form.setValue(`exerciseGroups.${groupIdx}.calculation_type`, getExerciseCalculationType(ex))
              }
            }}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          >
            <option value="">{t('selectExercise')}</option>
            {CATEGORIES.map((cat) => {
              const catExs = groupedExercises[cat]
              if (!catExs?.length) return null
              return (
                <optgroup key={cat} label={categoryLabel[cat]}>
                  {catExs.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {getExerciseDisplayName(ex, locale)}
                    </option>
                  ))}
                </optgroup>
              )
            })}
          </select>

          {groupErrors?.exercise_id && (
            <p className="text-[10px] text-destructive mt-0.5">
              {t('errors.exerciseRequired')}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed((p) => !p)}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
          aria-label={isCollapsed ? tCommon('expand') : tCommon('collapse')}
        >
          {isCollapsed ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={onRemoveGroup}
          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          aria-label={t('deleteSet')}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Sets */}
      {!isCollapsed && (
        <div className="divide-y divide-border/60">
          {/* Column headers */}
          <div
            className={cn(
              'gap-2 px-3 py-1.5 text-[11px] font-medium text-muted-foreground items-center bg-muted/10',
              calcType === 'reps' || calcType === 'duration'
                ? 'grid grid-cols-[1.5rem_1fr_auto]'
                : 'grid grid-cols-[1.5rem_1fr_1fr_auto]',
            )}
          >
            <span className="text-center">#</span>
            {calcType === 'weight_reps' && (
              <>
                <span className="text-center">{t('weight')}</span>
                <span className="text-center">{t('reps')}</span>
              </>
            )}
            {calcType === 'reps' && (
              <span className="text-center">{t('reps')}</span>
            )}
            {calcType === 'duration' && (
              <span className="text-center">{t('duration')}</span>
            )}
            {calcType === 'distance_duration' && (
              <>
                <span className="text-center">{t('distance')}</span>
                <span className="text-center">{t('duration')}</span>
              </>
            )}
            {calcType === 'reps_duration' && (
              <>
                <span className="text-center">{t('reps')}</span>
                <span className="text-center">{t('duration')}</span>
              </>
            )}
            <span className="w-5"></span>
          </div>

          {setFields.map((setField, setIdx) => (
            <SetRow
              key={setField.id}
              groupIdx={groupIdx}
              setIdx={setIdx}
              calcType={calcType}
              form={form}
              t={t}
              onRemove={() => removeSet(setIdx)}
            />
          ))}

          {/* Add Set Button */}
          <button
            type="button"
            onClick={addSet}
            className="w-full flex items-center justify-center gap-1 py-1.5 text-xs
                       font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            <Plus className="h-3 w-3" />
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
  calcType: CalculationType
  form: ReturnType<typeof useForm<WorkoutEditFormValues>>
  t: ReturnType<typeof useTranslations<'workout'>>
  onRemove: () => void
}

function SetRow({
  groupIdx,
  setIdx,
  calcType,
  form,
  t,
  onRemove,
}: SetRowProps) {
  const setErrors =
    form.formState.errors.exerciseGroups?.[groupIdx]?.sets?.[setIdx]

  const distanceKm = form.watch(
    `exerciseGroups.${groupIdx}.sets.${setIdx}.distance_km`,
  )
  const durationSeconds = form.watch(
    `exerciseGroups.${groupIdx}.sets.${setIdx}.duration_seconds`,
  )
  const pace = calcType === 'distance_duration' ? calculatePace(distanceKm, durationSeconds) : null

  return (
    <div>
      <div
        className={cn(
          'gap-2 px-3 py-1.5 items-center',
          calcType === 'reps' || calcType === 'duration'
            ? 'grid grid-cols-[1.5rem_1fr_auto]'
            : 'grid grid-cols-[1.5rem_1fr_1fr_auto]',
        )}
      >
        <span className="text-[11px] font-semibold text-muted-foreground text-center">
          {setIdx + 1}
        </span>

        {/* 1. Weight & Reps */}
        {calcType === 'weight_reps' && (
          <>
            <Controller
              control={form.control}
              name={`exerciseGroups.${groupIdx}.sets.${setIdx}.weight_kg`}
              render={({ field }) => (
                <input
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const val =
                      e.target.value === '' ? '' : Number(e.target.value)
                    field.onChange(val)
                  }}
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0"
                  placeholder="0"
                  aria-label={t('weight')}
                  className={cn(
                    'w-full rounded-md border border-border bg-background px-1.5 py-1 text-xs text-center',
                    'focus:outline-none focus:ring-1 focus:ring-primary',
                    setErrors?.weight_kg &&
                      'border-destructive focus:ring-destructive',
                  )}
                />
              )}
            />

            <Controller
              control={form.control}
              name={`exerciseGroups.${groupIdx}.sets.${setIdx}.reps`}
              render={({ field }) => (
                <input
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const val =
                      e.target.value === '' ? '' : Number(e.target.value)
                    field.onChange(val)
                  }}
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="0"
                  placeholder="0"
                  aria-label={t('reps')}
                  className={cn(
                    'w-full rounded-md border border-border bg-background px-1.5 py-1 text-xs text-center',
                    'focus:outline-none focus:ring-1 focus:ring-primary',
                    setErrors?.reps &&
                      'border-destructive focus:ring-destructive',
                  )}
                />
              )}
            />
          </>
        )}

        {/* 2. Reps Only */}
        {calcType === 'reps' && (
          <Controller
            control={form.control}
            name={`exerciseGroups.${groupIdx}.sets.${setIdx}.reps`}
            render={({ field }) => (
              <input
                {...field}
                value={field.value ?? ''}
                onChange={(e) => {
                  const val =
                    e.target.value === '' ? '' : Number(e.target.value)
                  field.onChange(val)
                }}
                type="number"
                inputMode="numeric"
                step="1"
                min="0"
                placeholder="0"
                aria-label={t('reps')}
                className={cn(
                  'w-full rounded-md border border-border bg-background px-1.5 py-1 text-xs text-center',
                  'focus:outline-none focus:ring-1 focus:ring-primary',
                  setErrors?.reps &&
                    'border-destructive focus:ring-destructive',
                )}
              />
            )}
          />
        )}

        {/* 3. Duration Only */}
        {calcType === 'duration' && (
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
                  'w-full rounded-md border border-border bg-background px-1.5 py-1 text-xs text-center',
                  'focus:outline-none focus:ring-1 focus:ring-primary',
                  setErrors?.duration_seconds &&
                    'border-destructive focus:ring-destructive',
                )}
              />
            )}
          />
        )}

        {/* 4. Distance & Time */}
        {calcType === 'distance_duration' && (
          <>
            <Controller
              control={form.control}
              name={`exerciseGroups.${groupIdx}.sets.${setIdx}.distance_km`}
              render={({ field }) => (
                <input
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const val =
                      e.target.value === '' ? '' : Number(e.target.value)
                    field.onChange(val)
                  }}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0.0"
                  aria-label={t('distance')}
                  className={cn(
                    'w-full rounded-md border border-border bg-background px-1.5 py-1 text-xs text-center',
                    'focus:outline-none focus:ring-1 focus:ring-primary',
                    setErrors?.distance_km &&
                      'border-destructive focus:ring-destructive',
                  )}
                />
              )}
            />

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
                    'w-full rounded-md border border-border bg-background px-1.5 py-1 text-xs text-center',
                    'focus:outline-none focus:ring-1 focus:ring-primary',
                    setErrors?.duration_seconds &&
                      'border-destructive focus:ring-destructive',
                  )}
                />
              )}
            />
          </>
        )}

        {/* 5. Reps & Time */}
        {calcType === 'reps_duration' && (
          <>
            <Controller
              control={form.control}
              name={`exerciseGroups.${groupIdx}.sets.${setIdx}.reps`}
              render={({ field }) => (
                <input
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const val =
                      e.target.value === '' ? '' : Number(e.target.value)
                    field.onChange(val)
                  }}
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="0"
                  placeholder="0"
                  aria-label={t('reps')}
                  className={cn(
                    'w-full rounded-md border border-border bg-background px-1.5 py-1 text-xs text-center',
                    'focus:outline-none focus:ring-1 focus:ring-primary',
                    setErrors?.reps &&
                      'border-destructive focus:ring-destructive',
                  )}
                />
              )}
            />

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
                    'w-full rounded-md border border-border bg-background px-1.5 py-1 text-xs text-center',
                    'focus:outline-none focus:ring-1 focus:ring-primary',
                    setErrors?.duration_seconds &&
                      'border-destructive focus:ring-destructive',
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
          className="p-1 text-muted-foreground hover:text-destructive transition-colors justify-self-center"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Pace display */}
      {calcType === 'distance_duration' && pace && (
        <div className="px-8 pb-1.5 text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
          <span className="text-primary">{t('pace')}:</span>
          <span className="text-foreground font-semibold">{pace}</span>
        </div>
      )}
    </div>
  )
}
