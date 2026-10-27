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
  Check,
  Tag as TagIcon,
  X,
  GripVertical,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getExerciseDisplayName,
  getExerciseCalculationType,
  getEffectiveExerciseTags,
  CALCULATION_TYPES,
  type Exercise,
  type Locale,
  type CalculationType,
} from '@/lib/exercises'
import { updateWorkout, type WorkoutHistoryEntry } from '@/lib/actions/workout'
import { addExerciseTag } from '@/lib/actions/exercise'
import { formatSecondsToTime, parseTimeToSeconds, calculatePace } from '@/lib/cardio'
import ExerciseSelectorModal from './ExerciseSelectorModal'

// ─── Types & Schema ──────────────────────────────────────────────────────────

const CATEGORIES = ['legs', 'glutes', 'chest', 'back', 'shoulders', 'arms', 'core', 'cardio', 'other'] as const
type Category = (typeof CATEGORIES)[number]

const SetSchema = z.object({
  exercise_id: z.string().optional(),
  set_number: z.number().int().positive(),
  weight_kg: z.coerce.number().min(0).optional().nullable(),
  reps: z.coerce.number().int().min(0).optional().nullable(),
  distance_km: z.coerce.number().min(0).optional().nullable(),
  duration_seconds: z.coerce.number().int().min(0).optional().nullable(),
  duration_text: z.string().optional(),
  tag: z.string().optional().nullable(),
  is_completed: z.boolean(),
})

const WorkoutEditFormSchema = z.object({
  date: z.string().min(1, { message: 'dateRequired' }),
  title: z.string().optional(),
  notes: z.string().optional(),
  exerciseGroups: z.array(
    z.object({
      exercise_id: z.string().min(1, { message: 'exerciseRequired' }),
      calculation_type: z.enum(CALCULATION_TYPES as unknown as [CalculationType, ...CalculationType[]]).optional(),
      tag: z.string().optional().nullable(),
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
  const map = new Map<string, { exercise_id: string; calculation_type: CalculationType; tag?: string | null; sets: z.infer<typeof SetSchema>[] }>()
  const groups: { exercise_id: string; calculation_type: CalculationType; tag?: string | null; sets: z.infer<typeof SetSchema>[] }[] = []

  for (const set of workout.workout_sets ?? []) {
    const groupKey = `${set.exercise_id}__${set.tag || ''}`
    let group = map.get(groupKey)
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
        tag: set.tag || null,
        sets: [],
      }
      map.set(groupKey, group)
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
      tag: set.tag ?? null,
      is_completed: set.is_completed ?? true,
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
                  is_completed: true,
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

  // Drag and drop state
  const [draggingGroupIndex, setDraggingGroupIndex] = useState<number | null>(null)
  const [dragOverGroupIndex, setDragOverGroupIndex] = useState<number | null>(null)

  function handleDragStart(index: number) {
    setDraggingGroupIndex(index)
  }

  function handleDragOver(index: number) {
    if (dragOverGroupIndex !== index) {
      setDragOverGroupIndex(index)
    }
  }

  function handleDrop(targetIndex: number) {
    if (draggingGroupIndex !== null && draggingGroupIndex !== targetIndex) {
      moveGroup(draggingGroupIndex, targetIndex)
    }
    setDraggingGroupIndex(null)
    setDragOverGroupIndex(null)
  }

  function handleDragEnd() {
    setDraggingGroupIndex(null)
    setDragOverGroupIndex(null)
  }

  function handleTouchStart(index: number) {
    setDraggingGroupIndex(index)
  }

  function handleTouchMove(e: React.TouchEvent) {
    const touch = e.touches[0]
    if (!touch) return
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    const card = el?.closest('[data-group-card-idx]')
    if (card) {
      const idx = Number(card.getAttribute('data-group-card-idx'))
      if (!isNaN(idx) && idx !== dragOverGroupIndex) {
        setDragOverGroupIndex(idx)
      }
    }
  }

  function handleTouchEnd() {
    if (draggingGroupIndex !== null && dragOverGroupIndex !== null && draggingGroupIndex !== dragOverGroupIndex) {
      moveGroup(draggingGroupIndex, dragOverGroupIndex)
    }
    setDraggingGroupIndex(null)
    setDragOverGroupIndex(null)
  }

  const form = useForm<WorkoutEditFormValues>({
    resolver: zodResolver(WorkoutEditFormSchema),
    defaultValues: workoutToFormValues(workout, exercises),
  })

  const {
    fields: exerciseGroupFields,
    append: appendGroup,
    remove: removeGroup,
    move: moveGroup,
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
            is_completed: true,
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
            tag: (group.tag || s.tag || '').trim() || null,
            is_completed: Boolean(s.is_completed ?? true),
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
            totalGroups={exerciseGroupFields.length}
            form={form}
            exercises={exercises}
            locale={locale}
            t={t}
            tEx={tEx}
            tCommon={tCommon}
            isBeingDragged={draggingGroupIndex === groupIdx}
            isDropTarget={dragOverGroupIndex === groupIdx && draggingGroupIndex !== groupIdx}
            onOpenPicker={() => handleOpenGroupPicker(groupIdx)}
            onRemoveGroup={() => removeGroup(groupIdx)}
            onMoveUp={() => moveGroup(groupIdx, groupIdx - 1)}
            onMoveDown={() => moveGroup(groupIdx, groupIdx + 1)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
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
  totalGroups: number
  form: ReturnType<typeof useForm<WorkoutEditFormValues>>
  exercises: Exercise[]
  locale: Locale
  t: ReturnType<typeof useTranslations<'workout'>>
  tEx: ReturnType<typeof useTranslations<'exercises'>>
  tCommon: ReturnType<typeof useTranslations<'common'>>
  isBeingDragged?: boolean
  isDropTarget?: boolean
  onOpenPicker: () => void
  onRemoveGroup: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDragStart?: (index: number) => void
  onDragOver?: (index: number) => void
  onDrop?: (index: number) => void
  onDragEnd?: () => void
  onTouchStart?: (index: number) => void
  onTouchMove?: (e: React.TouchEvent) => void
  onTouchEnd?: () => void
}

function ExerciseGroupCard({
  groupIdx,
  totalGroups,
  form,
  exercises,
  locale,
  t,
  tEx,
  tCommon,
  isBeingDragged,
  isDropTarget,
  onOpenPicker,
  onRemoveGroup,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
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
  const selectedTag = form.watch(`exerciseGroups.${groupIdx}.tag`) || ''
  const registerExercise = form.register(`exerciseGroups.${groupIdx}.exercise_id`)
  const groupErrors = form.formState.errors.exerciseGroups?.[groupIdx]

  const [isCustomTagInput, setIsCustomTagInput] = useState(false)
  const [customTagValue, setCustomTagValue] = useState('')

  const selectedExercise = exercises.find((ex) => ex.id === selectedExerciseId)
  const calcType = currentCalcType ?? getExerciseCalculationType(selectedExercise)
  const effectiveTags = selectedExercise ? getEffectiveExerciseTags(selectedExercise, locale) : []

  function handleSelectTag(tag: string) {
    if (selectedTag === tag) {
      form.setValue(`exerciseGroups.${groupIdx}.tag`, '')
    } else {
      form.setValue(`exerciseGroups.${groupIdx}.tag`, tag)
    }
  }

  async function handleApplyCustomTag() {
    const clean = customTagValue.trim()
    if (!clean) {
      setIsCustomTagInput(false)
      return
    }
    form.setValue(`exerciseGroups.${groupIdx}.tag`, clean)
    if (selectedExercise) {
      if (!selectedExercise.tags) selectedExercise.tags = []
      if (!selectedExercise.tags.includes(clean)) {
        selectedExercise.tags.push(clean)
      }
      addExerciseTag(selectedExercise.id, clean).catch(() => {})
    }
    setCustomTagValue('')
    setIsCustomTagInput(false)
  }

  const calcTypeLabel: Record<CalculationType, string> = {
    weight_reps: t('calculationType.weight_reps'),
    reps: t('calculationType.reps'),
    duration: t('calculationType.duration'),
    distance_duration: t('calculationType.distance_duration'),
    reps_duration: t('calculationType.reps_duration'),
  }

  const categoryLabel: Record<Category, string> = {
    legs: tEx('categories.legs'),
    glutes: tEx('categories.glutes'),
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
      is_completed: lastSet?.is_completed ?? true,
    })
  }

  function handleCalcTypeChange(newType: CalculationType) {
    form.setValue(`exerciseGroups.${groupIdx}.calculation_type`, newType)
  }

  return (
    <div
      data-group-card-idx={groupIdx}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        onDragOver?.(groupIdx)
      }}
      onDrop={(e) => {
        e.preventDefault()
        onDrop?.(groupIdx)
      }}
      className={cn(
        'rounded-xl border bg-card overflow-hidden transition-all duration-150',
        isBeingDragged && 'opacity-40 border-dashed border-primary scale-[0.99]',
        isDropTarget && 'ring-2 ring-primary ring-offset-2 ring-offset-background border-primary',
        !isBeingDragged && !isDropTarget && 'border-border/80',
      )}
    >
      {/* Group header */}
      <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-muted/40 border-b border-border/60">
        {/* Reorder controls (Drag handle + Up/Down arrows) */}
        <div className="flex items-center gap-0.5 shrink-0 -ml-0.5 mr-0.5">
          {/* Drag handle */}
          <div
            data-drag-handle="true"
            draggable={true}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', String(groupIdx))
              const card = (e.currentTarget as HTMLElement).closest('[data-group-card-idx]') as HTMLElement
              if (card && e.dataTransfer.setDragImage) {
                const rect = card.getBoundingClientRect()
                const offsetX = Math.max(10, Math.min(e.clientX - rect.left, rect.width - 10))
                const offsetY = Math.max(10, Math.min(e.clientY - rect.top, 40))
                e.dataTransfer.setDragImage(card, offsetX, offsetY)
              }
              onDragStart?.(groupIdx)
            }}
            onDragEnd={() => {
              onDragEnd?.()
            }}
            className="p-1 rounded cursor-grab active:cursor-grabbing hover:bg-muted text-muted-foreground/60 hover:text-foreground touch-none select-none transition-colors"
            title={t('dragToReorder')}
            aria-label={t('dragToReorder')}
            onTouchStart={() => onTouchStart?.(groupIdx)}
            onTouchMove={(e) => onTouchMove?.(e)}
            onTouchEnd={() => onTouchEnd?.()}
          >
            <GripVertical className="h-3.5 w-3.5 pointer-events-none" />
          </div>

          {/* Up / Down arrows (vertical compact stepper) */}
          <div className="flex flex-col -space-y-0.5">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={groupIdx === 0}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
              aria-label={t('moveUp')}
              title={t('moveUp')}
            >
              <ChevronUp className="h-2.5 w-2.5" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={groupIdx === totalGroups - 1}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
              aria-label={t('moveDown')}
              title={t('moveDown')}
            >
              <ChevronDown className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>

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

          {/* Variations & Tags selection row */}
          {selectedExercise && (
            <div className="flex items-center gap-1.5 flex-wrap mt-1.5 pt-1.5 border-t border-border/40">
              <span className="text-[10px] font-medium text-muted-foreground mr-0.5 flex items-center gap-1">
                <TagIcon className="h-2.5 w-2.5 text-muted-foreground/70" />
                {t('formVariation')}:
              </span>

              {/* Tag options */}
              {effectiveTags.map((tag) => {
                const isSelected = selectedTag === tag
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSelectTag(tag)}
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full border transition-all',
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary font-medium shadow-xs'
                        : 'bg-background hover:bg-muted text-muted-foreground border-border',
                    )}
                  >
                    {tag}
                  </button>
                )
              })}

              {/* Custom tag input / trigger */}
              {isCustomTagInput ? (
                <div className="inline-flex items-center gap-1 bg-background border border-primary/60 rounded-full px-1.5 py-0.5">
                  <input
                    type="text"
                    value={customTagValue}
                    onChange={(e) => setCustomTagValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleApplyCustomTag()
                      } else if (e.key === 'Escape') {
                        setIsCustomTagInput(false)
                        setCustomTagValue('')
                      }
                    }}
                    placeholder={t('tagPlaceholder')}
                    className="text-[10px] bg-transparent border-none outline-none w-20 text-foreground placeholder:text-muted-foreground/60"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustomTag}
                    className="text-primary hover:text-primary/80 transition-colors"
                  >
                    <Check className="h-2.5 w-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomTagInput(false)
                      setCustomTagValue('')
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomTagInput(true)
                    setCustomTagValue('')
                  }}
                  className="text-[10px] px-1.5 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  {t('addCustomTag')}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-auto">
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
      </div>

      {/* Sets */}
      {!isCollapsed && (
        <div className="divide-y divide-border/60">
          {/* Column headers */}
          <div
            className={cn(
              'gap-2 px-3 py-1.5 text-[11px] font-medium text-muted-foreground items-center bg-muted/10',
              calcType === 'reps' || calcType === 'duration'
                ? 'grid grid-cols-[1.5rem_1fr_1.75rem_1.5rem]'
                : 'grid grid-cols-[1.5rem_1fr_1fr_1.75rem_1.5rem]',
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
              <Check className="h-3 w-3 mx-auto opacity-70" />
            </span>
            <span className="w-4"></span>
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
  const isCompleted = form.watch(
    `exerciseGroups.${groupIdx}.sets.${setIdx}.is_completed`,
  )
  const setErrors =
    form.formState.errors.exerciseGroups?.[groupIdx]?.sets?.[setIdx]

  const distanceKm = form.watch(
    `exerciseGroups.${groupIdx}.sets.${setIdx}.distance_km`,
  )
  const durationSeconds = form.watch(
    `exerciseGroups.${groupIdx}.sets.${setIdx}.duration_seconds`,
  )
  const pace = calcType === 'distance_duration' ? calculatePace(distanceKm, durationSeconds) : null

  function handleToggleComplete() {
    form.setValue(`exerciseGroups.${groupIdx}.sets.${setIdx}.is_completed`, !isCompleted, {
      shouldDirty: true,
    })
  }

  return (
    <div className={cn('transition-colors', isCompleted && 'bg-emerald-500/[0.04] dark:bg-emerald-950/20')}>
      <div
        className={cn(
          'gap-2 px-3 py-1.5 items-center',
          calcType === 'reps' || calcType === 'duration'
            ? 'grid grid-cols-[1.5rem_1fr_1.75rem_1.5rem]'
            : 'grid grid-cols-[1.5rem_1fr_1fr_1.75rem_1.5rem]',
        )}
      >
        <span
          className={cn(
            'text-[11px] font-semibold text-center transition-colors',
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

        {/* Complete toggle button */}
        <button
          type="button"
          onClick={handleToggleComplete}
          aria-label={t('completed')}
          className={cn(
            'w-7 h-7 rounded-md flex items-center justify-center transition-all justify-self-center',
            isCompleted
              ? 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 active:scale-95'
              : 'border border-border/80 bg-muted/40 text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted active:scale-95',
          )}
        >
          <Check className={cn('h-3.5 w-3.5', isCompleted ? 'stroke-[2.5]' : 'stroke-2')} />
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
