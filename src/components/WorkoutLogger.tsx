'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useForm, useFieldArray, Controller, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations, useLocale } from 'next-intl'
import {
  Plus, Trash2, ChevronDown, ChevronUp, Save, Dumbbell, Sparkles, Check
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
import { saveWorkout, getLastSetForExercise } from '@/lib/actions/workout'
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
  is_completed: z.boolean(),
})

const WorkoutFormSchema = z.object({
  date: z.string().optional(),
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

function getDefaultSetForCalcType(
  calcType: CalculationType,
  exerciseId: string,
  setNumber: number,
  lastSet?: Partial<z.infer<typeof SetSchema>>,
  lastSession?: LastSession | null,
) {
  switch (calcType) {
    case 'reps':
      return {
        exercise_id: exerciseId,
        set_number: setNumber,
        weight_kg: null,
        reps: lastSet?.reps ?? lastSession?.reps ?? 10,
        distance_km: null,
        duration_seconds: null,
        duration_text: '',
        is_completed: false,
      }
    case 'duration':
      return {
        exercise_id: exerciseId,
        set_number: setNumber,
        weight_kg: null,
        reps: null,
        distance_km: null,
        duration_seconds: lastSet?.duration_seconds ?? lastSession?.duration_seconds ?? null,
        duration_text: lastSet?.duration_text ?? formatSecondsToTime(lastSession?.duration_seconds) ?? '',
        is_completed: false,
      }
    case 'distance_duration':
      return {
        exercise_id: exerciseId,
        set_number: setNumber,
        weight_kg: null,
        reps: null,
        distance_km: lastSet?.distance_km ?? lastSession?.distance_km ?? null,
        duration_seconds: lastSet?.duration_seconds ?? lastSession?.duration_seconds ?? null,
        duration_text: lastSet?.duration_text ?? formatSecondsToTime(lastSession?.duration_seconds) ?? '',
        is_completed: false,
      }
    case 'reps_duration':
      return {
        exercise_id: exerciseId,
        set_number: setNumber,
        weight_kg: null,
        reps: lastSet?.reps ?? lastSession?.reps ?? 50,
        distance_km: null,
        duration_seconds: lastSet?.duration_seconds ?? lastSession?.duration_seconds ?? null,
        duration_text: lastSet?.duration_text ?? formatSecondsToTime(lastSession?.duration_seconds) ?? '',
        is_completed: false,
      }
    case 'weight_reps':
    default:
      return {
        exercise_id: exerciseId,
        set_number: setNumber,
        weight_kg: lastSet?.weight_kg ?? lastSession?.weight_kg ?? 0,
        reps: lastSet?.reps ?? lastSession?.reps ?? 10,
        distance_km: null,
        duration_seconds: null,
        duration_text: '',
        is_completed: false,
      }
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WorkoutLogger({ exercises }: WorkoutLoggerProps) {
  const t = useTranslations('workout')
  const tEx = useTranslations('exercises')
  const tCommon = useTranslations('common')
  const locale = useLocale() as Locale
  const [isPending, startTransition] = useTransition()
  const [lastSessions, setLastSessions] = useState<Record<string, LastSession | null>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [today, setToday] = useState('')

  // Modal state
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [pickerTargetGroupIdx, setPickerTargetGroupIdx] = useState<number | 'new' | null>(null)

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

  // ─── Open picker for new group ──────────────────────────────────────────

  function handleOpenNewGroupPicker() {
    setSaveError(null)
    setPickerTargetGroupIdx('new')
    setIsPickerOpen(true)
  }

  // ─── Open picker for existing group ─────────────────────────────────────

  function handleOpenGroupPicker(groupIdx: number) {
    setSaveError(null)
    setPickerTargetGroupIdx(groupIdx)
    setIsPickerOpen(true)
  }

  // ─── Select exercise from modal ──────────────────────────────────────────

  function handleSelectExercise(selectedEx: Exercise) {
    const calcType = getExerciseCalculationType(selectedEx)
    fetchLastSession(selectedEx.id)

    if (pickerTargetGroupIdx === 'new') {
      appendGroup({
        exercise_id: selectedEx.id,
        calculation_type: calcType,
        sets: [
          getDefaultSetForCalcType(calcType, selectedEx.id, 1, undefined, lastSessions[selectedEx.id]),
        ],
      })
    } else if (typeof pickerTargetGroupIdx === 'number') {
      const idx = pickerTargetGroupIdx
      form.setValue(`exerciseGroups.${idx}.exercise_id`, selectedEx.id, { shouldValidate: true })
      form.setValue(`exerciseGroups.${idx}.calculation_type`, calcType)

      // Reset initial set defaults based on new calculation type
      const currentSets = form.getValues(`exerciseGroups.${idx}.sets`) || []
      const updatedSets = currentSets.map((s, sIdx) =>
        getDefaultSetForCalcType(calcType, selectedEx.id, sIdx + 1, s, lastSessions[selectedEx.id]),
      )
      form.setValue(`exerciseGroups.${idx}.sets`, updatedSets)
    }

    setIsPickerOpen(false)
    setPickerTargetGroupIdx(null)
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  function onSubmit(values: WorkoutFormValues) {
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
            is_completed: Boolean(s.is_completed),
          }
        })
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
        <div className="text-center py-10 space-y-3">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Dumbbell className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted-foreground">{t('noExercises')}</p>
        </div>
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
              tEx={tEx}
              tCommon={tCommon}
              lastSession={lastSessions[watchedGroups[groupIdx]?.exercise_id] ?? null}
              onOpenPicker={() => handleOpenGroupPicker(groupIdx)}
              onExerciseChange={(id) => fetchLastSession(id)}
              onRemoveGroup={() => removeGroup(groupIdx)}
            />
          ))}
        </div>
      )}

      {/* Add Exercise button */}
      <button
        type="button"
        onClick={handleOpenNewGroupPicker}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
                   border-2 border-dashed border-border text-sm font-medium text-foreground
                   hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
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
                   hover:bg-primary/90 transition-colors active:scale-[0.98] shadow-md"
      >
        <Save className="h-5 w-5" />
        {isPending ? t('saveWorkout') + '...' : t('finishWorkout')}
      </button>

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
  form: ReturnType<typeof useForm<WorkoutFormValues>>
  exercises: Exercise[]
  locale: Locale
  t: ReturnType<typeof useTranslations<'workout'>>
  tEx: ReturnType<typeof useTranslations<'exercises'>>
  tCommon: ReturnType<typeof useTranslations<'common'>>
  lastSession: LastSession | null
  onOpenPicker: () => void
  onExerciseChange: (id: string) => void
  onRemoveGroup: () => void
}

function ExerciseGroupCard({
  groupIdx, form, exercises, locale, t, tEx, tCommon, lastSession,
  onOpenPicker, onExerciseChange, onRemoveGroup,
}: ExerciseGroupCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const { fields: setFields, append: appendSet, remove: removeSet } = useFieldArray({
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

  // Group exercises by category for native <optgroup> fallback
  const groupedExercises = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    const cat = ex.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(ex)
    return acc
  }, {})

  function addSet() {
    const currentSets = form.getValues(`exerciseGroups.${groupIdx}.sets`) || []
    const lastSet = currentSets[currentSets.length - 1]
    const newSet = getDefaultSetForCalcType(
      calcType,
      selectedExerciseId || '',
      setFields.length + 1,
      lastSet,
      lastSession,
    )
    appendSet(newSet)
  }

  function handleCalcTypeChange(newType: CalculationType) {
    form.setValue(`exerciseGroups.${groupIdx}.calculation_type`, newType)
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Group header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b border-border/60">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Clickable Exercise Name button (opens categorized modal) */}
            <button
              type="button"
              onClick={onOpenPicker}
              className="text-left font-semibold text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
            >
              <span className={cn(!selectedExercise && 'text-muted-foreground')}>
                {selectedExercise ? getExerciseDisplayName(selectedExercise, locale) : t('selectExercise')}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {/* Calculation Type Selector */}
            <div className="relative inline-block">
              <select
                value={calcType}
                onChange={(e) => handleCalcTypeChange(e.target.value as CalculationType)}
                className="text-[11px] font-medium bg-muted/80 text-foreground px-2 py-0.5 rounded-md border border-border/60 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                title={t('calculationType.label')}
              >
                {CALCULATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {calcTypeLabel[type]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Hidden or secondary native select with <optgroup> for accessibility / fallback */}
          <select
            {...registerExercise}
            onChange={(e) => {
              registerExercise.onChange(e)
              const newId = e.target.value
              onExerciseChange(newId)
              const ex = exercises.find((item) => item.id === newId)
              if (ex) {
                const newCalcType = getExerciseCalculationType(ex)
                form.setValue(`exerciseGroups.${groupIdx}.calculation_type`, newCalcType)
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
            <p className="text-xs text-destructive mt-0.5">{t('errors.exerciseRequired')}</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed((p) => !p)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          aria-label={isCollapsed ? tCommon('expand') : tCommon('collapse')}
        >
          {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onRemoveGroup}
          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          aria-label={t('deleteSet')}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Last session hint */}
      {lastSession && !isCollapsed && (
        <div className="px-4 py-1.5 text-xs text-muted-foreground bg-primary/5 border-b border-border">
          {calcType === 'weight_reps' && (
            <>
              {t('lastSession')}: {lastSession.weight_kg ?? 0}kg × {lastSession.reps ?? 0} {t('reps')}
            </>
          )}
          {calcType === 'reps' && (
            <>
              {t('lastSession')}: {lastSession.reps ?? 0} {t('reps')}
            </>
          )}
          {calcType === 'duration' && (
            <>
              {t('lastSession')}: {formatSecondsToTime(lastSession.duration_seconds)}
            </>
          )}
          {calcType === 'distance_duration' && (
            <>
              {t('lastSession')}: {lastSession.distance_km != null ? `${lastSession.distance_km} km` : ''}
              {lastSession.distance_km != null && lastSession.duration_seconds != null ? ' • ' : ''}
              {lastSession.duration_seconds != null ? formatSecondsToTime(lastSession.duration_seconds) : ''}
              {calculatePace(lastSession.distance_km, lastSession.duration_seconds)
                ? ` (${calculatePace(lastSession.distance_km, lastSession.duration_seconds)})`
                : ''}
            </>
          )}
          {calcType === 'reps_duration' && (
            <>
              {t('lastSession')}: {lastSession.reps != null ? `${lastSession.reps} ${t('reps')}` : ''}
              {lastSession.reps != null && lastSession.duration_seconds != null ? ' • ' : ''}
              {lastSession.duration_seconds != null ? formatSecondsToTime(lastSession.duration_seconds) : ''}
            </>
          )}
        </div>
      )}

      {/* Sets */}
      {!isCollapsed && (
        <div className="divide-y divide-border/60">
          {/* Column headers based on calculation type */}
          <div
            className={cn(
              'gap-2 px-4 py-2 text-xs font-medium text-muted-foreground items-center',
              calcType === 'reps' || calcType === 'duration'
                ? 'grid grid-cols-[2rem_1fr_2rem_1.75rem]'
                : 'grid grid-cols-[2rem_1fr_1fr_2rem_1.75rem]',
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
            <span className="text-center flex items-center justify-center" title={t('completed')}>
              <Check className="h-3.5 w-3.5 mx-auto opacity-70" />
            </span>
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
  calcType: CalculationType
  form: ReturnType<typeof useForm<WorkoutFormValues>>
  t: ReturnType<typeof useTranslations<'workout'>>
  onRemove: () => void
}

function SetRow({ groupIdx, setIdx, calcType, form, t, onRemove }: SetRowProps) {
  const isCompleted = form.watch(`exerciseGroups.${groupIdx}.sets.${setIdx}.is_completed`)
  const setErrors = form.formState.errors.exerciseGroups?.[groupIdx]?.sets?.[setIdx]

  const distanceKm = form.watch(`exerciseGroups.${groupIdx}.sets.${setIdx}.distance_km`)
  const durationSeconds = form.watch(`exerciseGroups.${groupIdx}.sets.${setIdx}.duration_seconds`)
  const pace = calcType === 'distance_duration' ? calculatePace(distanceKm, durationSeconds) : null

  function handleToggleComplete() {
    form.setValue(`exerciseGroups.${groupIdx}.sets.${setIdx}.is_completed`, !isCompleted, {
      shouldDirty: true,
    })
  }

  return (
    <div className={cn('transition-colors', isCompleted && 'bg-emerald-500/[0.05] dark:bg-emerald-950/20')}>
      <div
        className={cn(
          'gap-2 px-4 py-2 items-center',
          calcType === 'reps' || calcType === 'duration'
            ? 'grid grid-cols-[2rem_1fr_2rem_1.75rem]'
            : 'grid grid-cols-[2rem_1fr_1fr_2rem_1.75rem]',
        )}
      >
        {/* Set number */}
        <span
          className={cn(
            'text-xs font-semibold text-center transition-colors',
            isCompleted ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-muted-foreground',
          )}
        >
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
                  min="0"
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
                  const val = e.target.value === '' ? '' : Number(e.target.value)
                  field.onChange(val)
                }}
                type="number"
                inputMode="numeric"
                step="1"
                min="0"
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
        )}

        {/* 3. Time / Duration Only */}
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
                  form.setValue(`exerciseGroups.${groupIdx}.sets.${setIdx}.duration_seconds`, seconds)
                }}
                onBlur={(e) => {
                  const seconds = parseTimeToSeconds(e.target.value)
                  if (seconds != null) {
                    field.onChange(formatSecondsToTime(seconds))
                    form.setValue(`exerciseGroups.${groupIdx}.sets.${setIdx}.duration_seconds`, seconds)
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
                    form.setValue(`exerciseGroups.${groupIdx}.sets.${setIdx}.duration_seconds`, seconds)
                  }}
                  onBlur={(e) => {
                    const seconds = parseTimeToSeconds(e.target.value)
                    if (seconds != null) {
                      field.onChange(formatSecondsToTime(seconds))
                      form.setValue(`exerciseGroups.${groupIdx}.sets.${setIdx}.duration_seconds`, seconds)
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
        )}

        {/* 5. Reps & Time (Jump Rope, etc.) */}
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
                    const val = e.target.value === '' ? '' : Number(e.target.value)
                    field.onChange(val)
                  }}
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="0"
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
                    form.setValue(`exerciseGroups.${groupIdx}.sets.${setIdx}.duration_seconds`, seconds)
                  }}
                  onBlur={(e) => {
                    const seconds = parseTimeToSeconds(e.target.value)
                    if (seconds != null) {
                      field.onChange(formatSecondsToTime(seconds))
                      form.setValue(`exerciseGroups.${groupIdx}.sets.${setIdx}.duration_seconds`, seconds)
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
        )}

        {/* Complete toggle button */}
        <button
          type="button"
          onClick={handleToggleComplete}
          aria-label={t('completed')}
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-all justify-self-center',
            isCompleted
              ? 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 active:scale-95'
              : 'border border-border/80 bg-muted/40 text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted active:scale-95',
          )}
        >
          <Check className={cn('h-4 w-4', isCompleted ? 'stroke-[2.5]' : 'stroke-2')} />
        </button>

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

      {/* Live calculated pace display */}
      {calcType === 'distance_duration' && pace && (
        <div className="px-12 pb-2 text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
          <span className="text-primary">{t('pace')}:</span>
          <span className="text-foreground font-semibold">{pace}</span>
        </div>
      )}
    </div>
  )
}
