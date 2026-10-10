'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations, useLocale } from 'next-intl'
import {
  Plus, Trash2, CheckCircle2, Circle, ChevronDown, ChevronUp, Save
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getExerciseDisplayName, type Exercise, type Locale } from '@/lib/exercises'
import { saveWorkout, getLastSetForExercise } from '@/lib/actions/workout'
import RestTimer from './RestTimer'

// ─── Types & Schema ──────────────────────────────────────────────────────────

const SetSchema = z.object({
  exercise_id: z.string().min(1, 'Required'),
  set_number: z.number().int().positive(),
  weight_kg: z.coerce.number().nonnegative({ message: 'weightRequired' }),
  reps: z.coerce.number().int().positive({ message: 'repsRequired' }),
  is_completed: z.boolean(),
  rpe: z.coerce.number().min(1).max(10).nullable().optional(),
})

const WorkoutFormSchema = z.object({
  date: z.string(),
  title: z.string().optional(),
  notes: z.string().optional(),
  exerciseGroups: z.array(
    z.object({
      exercise_id: z.string().min(1),
      sets: z.array(SetSchema).min(1),
    }),
  ).min(1),
})

type WorkoutFormValues = z.infer<typeof WorkoutFormSchema>

interface WorkoutLoggerProps {
  exercises: Exercise[]
}

interface LastSession {
  weight_kg: number
  reps: number
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WorkoutLogger({ exercises }: WorkoutLoggerProps) {
  const t = useTranslations('workout')
  const locale = useLocale() as Locale
  const [isPending, startTransition] = useTransition()
  const [showTimer, setShowTimer] = useState(false)
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
    appendGroup({
      exercise_id: '',
      sets: [{ exercise_id: '', set_number: 1, weight_kg: 0, reps: 0, is_completed: false }],
    })
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  function onSubmit(values: WorkoutFormValues) {
    setSaveError(null)
    startTransition(async () => {
      const flatSets = values.exerciseGroups.flatMap((group) =>
        group.sets.map((s) => ({
          ...s,
          exercise_id: group.exercise_id,
        })),
      )

      const result = await saveWorkout({
        date: values.date,
        title: values.title || undefined,
        notes: values.notes || undefined,
        sets: flatSets,
      })

      if ('error' in result) {
        setSaveError(result.error)
      } else {
        setSaved(true)
        form.reset({ date: today, title: '', notes: '', exerciseGroups: [] })
        setTimeout(() => setSaved(false), 3000)
      }
    })
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
              lastSession={lastSessions[watchedGroups[groupIdx]?.exercise_id] ?? null}
              onExerciseChange={(id) => fetchLastSession(id)}
              onRemoveGroup={() => removeGroup(groupIdx)}
              onSetCompleted={() => setShowTimer(true)}
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
        <p className="text-sm text-destructive text-center">{t('errors.saveFailed')}: {saveError}</p>
      )}
      {saved && (
        <p className="text-sm text-green-600 text-center font-medium">{t('workoutSaved')}</p>
      )}

      {/* Save button */}
      <button
        type="button"
        onClick={form.handleSubmit(onSubmit)}
        disabled={isPending || exerciseGroupFields.length === 0}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl
                   bg-primary text-primary-foreground font-semibold text-base
                   disabled:opacity-50 disabled:cursor-not-allowed
                   hover:bg-primary/90 transition-colors active:scale-[0.98]"
      >
        <Save className="h-5 w-5" />
        {isPending ? t('saveWorkout') + '...' : t('finishWorkout')}
      </button>

      {/* Rest Timer floating overlay */}
      {showTimer && <RestTimer onClose={() => setShowTimer(false)} />}
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
  lastSession: LastSession | null
  onExerciseChange: (id: string) => void
  onRemoveGroup: () => void
  onSetCompleted: () => void
}

function ExerciseGroupCard({
  groupIdx, form, exercises, locale, t, lastSession,
  onExerciseChange, onRemoveGroup, onSetCompleted,
}: ExerciseGroupCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const { fields: setFields, append: appendSet, remove: removeSet } = useFieldArray({
    control: form.control,
    name: `exerciseGroups.${groupIdx}.sets`,
  })

  const selectedExerciseId = form.watch(`exerciseGroups.${groupIdx}.exercise_id`)

  function addSet() {
    appendSet({
      exercise_id: selectedExerciseId,
      set_number: setFields.length + 1,
      weight_kg: lastSession?.weight_kg ?? 0,
      reps: lastSession?.reps ?? 0,
      is_completed: false,
    })
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Group header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/40">
        <select
          {...form.register(`exerciseGroups.${groupIdx}.exercise_id`)}
          onChange={(e) => {
            form.setValue(`exerciseGroups.${groupIdx}.exercise_id`, e.target.value)
            onExerciseChange(e.target.value)
          }}
          className="flex-1 bg-transparent text-sm font-medium text-foreground
                     focus:outline-none focus:ring-0 border-0"
        >
          <option value="">{t('selectExercise')}</option>
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {getExerciseDisplayName(ex, locale)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setIsCollapsed((p) => !p)}
          className="p-1 rounded-lg hover:bg-muted transition-colors"
          aria-label={isCollapsed ? 'Expand' : 'Collapse'}
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
          {t('lastSession')}: {lastSession.weight_kg}kg × {lastSession.reps} {t('reps')}
        </div>
      )}

      {/* Sets */}
      {!isCollapsed && (
        <div className="divide-y divide-border">
          {/* Column headers */}
          <div className="grid grid-cols-[2rem_1fr_1fr_auto_auto] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground">
            <span>#</span>
            <span>{t('weight')}</span>
            <span>{t('reps')}</span>
            <span className="text-center">RPE</span>
            <span></span>
          </div>

          {setFields.map((setField, setIdx) => (
            <SetRow
              key={setField.id}
              groupIdx={groupIdx}
              setIdx={setIdx}
              form={form}
              t={t}
              onCompleted={onSetCompleted}
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
  form: ReturnType<typeof useForm<WorkoutFormValues>>
  t: ReturnType<typeof useTranslations<'workout'>>
  onCompleted: () => void
  onRemove: () => void
}

function SetRow({ groupIdx, setIdx, form, t, onCompleted, onRemove }: SetRowProps) {
  const isCompleted = form.watch(`exerciseGroups.${groupIdx}.sets.${setIdx}.is_completed`)

  function handleToggleComplete() {
    const next = !isCompleted
    form.setValue(`exerciseGroups.${groupIdx}.sets.${setIdx}.is_completed`, next)
    if (next) onCompleted()
  }

  return (
    <div className={cn(
      'grid grid-cols-[2rem_1fr_1fr_auto_auto] gap-2 px-4 py-2 items-center transition-colors',
      isCompleted && 'bg-green-50 dark:bg-green-950/20',
    )}>
      {/* Set number */}
      <span className="text-xs font-semibold text-muted-foreground text-center">
        {setIdx + 1}
      </span>

      {/* Weight */}
      <Controller
        control={form.control}
        name={`exerciseGroups.${groupIdx}.sets.${setIdx}.weight_kg`}
        render={({ field }) => (
          <input
            {...field}
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            placeholder="0"
            aria-label={t('weight')}
            className={cn(
              'w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-center',
              'focus:outline-none focus:ring-2 focus:ring-primary',
              isCompleted && 'opacity-60',
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
            type="number"
            inputMode="numeric"
            step="1"
            min="1"
            placeholder="0"
            aria-label={t('reps')}
            className={cn(
              'w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-center',
              'focus:outline-none focus:ring-2 focus:ring-primary',
              isCompleted && 'opacity-60',
            )}
          />
        )}
      />

      {/* RPE (optional) */}
      <Controller
        control={form.control}
        name={`exerciseGroups.${groupIdx}.sets.${setIdx}.rpe`}
        render={({ field }) => (
          <input
            {...field}
            value={field.value ?? ''}
            type="number"
            inputMode="numeric"
            step="1"
            min="1"
            max="10"
            placeholder="—"
            aria-label={t('rpe')}
            className={cn(
              'w-10 rounded-lg border border-border bg-background px-1 py-1.5 text-sm text-center',
              'focus:outline-none focus:ring-2 focus:ring-primary',
              isCompleted && 'opacity-60',
            )}
          />
        )}
      />

      {/* Complete + Delete */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleToggleComplete}
          aria-label={t('completed')}
          className="p-1 transition-colors"
        >
          {isCompleted
            ? <CheckCircle2 className="h-5 w-5 text-green-500" />
            : <Circle className="h-5 w-5 text-muted-foreground" />
          }
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={t('deleteSet')}
          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
