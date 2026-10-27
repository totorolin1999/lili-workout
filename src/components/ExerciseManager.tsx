'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Plus, ChevronDown, ChevronUp, Pencil, Trash2, Dumbbell, Tag as TagIcon, X, Check } from 'lucide-react'
import {
  getExerciseDisplayName,
  getPrimaryNameField,
  getExerciseCalculationType,
  getEffectiveExerciseTags,
  CALCULATION_TYPES,
  type Exercise,
  type Locale,
  type CalculationType,
} from '@/lib/exercises'
import {
  createExercise,
  updateExercise,
  deleteExercise,
  addExerciseTag,
  removeExerciseTag,
} from '@/lib/actions/exercise'

// ─── Types & Schema ──────────────────────────────────────────────────────────

const CATEGORIES = ['legs', 'glutes', 'chest', 'back', 'shoulders', 'arms', 'core', 'cardio', 'other'] as const
type Category = (typeof CATEGORIES)[number]

const ExerciseFormSchema = z.object({
  name_hu: z.string().max(200).optional(),
  name_en: z.string().max(200).optional(),
  name_zh: z.string().max(200).optional(),
  category: z.enum(CATEGORIES),
  calculation_type: z.enum(CALCULATION_TYPES as unknown as [CalculationType, ...CalculationType[]]),
  tags_text: z.string().optional(),
}).refine((d) => d.name_hu || d.name_en || d.name_zh, {
  message: 'At least one name must be provided',
})

type ExerciseFormValues = z.infer<typeof ExerciseFormSchema>

interface ExerciseManagerProps {
  exercises: Exercise[]
  locale: Locale
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ExerciseManager({ exercises: initialExercises, locale }: ExerciseManagerProps) {
  const t = useTranslations('exercises')
  const [isPending, startTransition] = useTransition()
  const [exercises, setExercises] = useState(initialExercises)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showTranslations, setShowTranslations] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track inline tag adding state per exercise ID
  const [addingTagForId, setAddingTagForId] = useState<string | null>(null)
  const [newTagInput, setNewTagInput] = useState('')
  const [tagActionPending, setTagActionPending] = useState(false)

  const primaryField = getPrimaryNameField(locale)

  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(ExerciseFormSchema),
    defaultValues: {
      name_hu: '',
      name_en: '',
      name_zh: '',
      category: 'legs',
      calculation_type: 'weight_reps',
      tags_text: '',
    },
  })

  const categoryLabel: Record<Category, string> = {
    legs: t('categories.legs'),
    glutes: t('categories.glutes'),
    chest: t('categories.chest'),
    back: t('categories.back'),
    shoulders: t('categories.shoulders'),
    arms: t('categories.arms'),
    core: t('categories.core'),
    cardio: t('categories.cardio'),
    other: t('categories.other'),
  }

  const calcTypeLabel: Record<CalculationType, string> = {
    weight_reps: t('calculationTypes.weight_reps'),
    reps: t('calculationTypes.reps'),
    duration: t('calculationTypes.duration'),
    distance_duration: t('calculationTypes.distance_duration'),
    reps_duration: t('calculationTypes.reps_duration'),
  }

  function startNew() {
    form.reset({
      name_hu: '',
      name_en: '',
      name_zh: '',
      category: 'legs',
      calculation_type: 'weight_reps',
      tags_text: '',
    })
    setEditingId(null)
    setShowForm(true)
    setError(null)
  }

  function startEdit(ex: Exercise) {
    const existingTags = ex.tags ?? []
    form.reset({
      name_hu: ex.name_hu ?? '',
      name_en: ex.name_en ?? '',
      name_zh: ex.name_zh ?? '',
      category: ex.category as Category,
      calculation_type: getExerciseCalculationType(ex),
      tags_text: existingTags.join(', '),
    })
    setEditingId(ex.id)
    setShowForm(true)
    setError(null)
  }

  function onSubmit(values: ExerciseFormValues) {
    setError(null)
    startTransition(async () => {
      const parsedTags = (values.tags_text ?? '')
        .split(/[,，、]+/)
        .map((t) => t.trim())
        .filter(Boolean)

      const payload = {
        name_hu: values.name_hu || null,
        name_en: values.name_en || null,
        name_zh: values.name_zh || null,
        category: values.category,
        calculation_type: values.calculation_type,
        tags: parsedTags,
      }

      if (editingId) {
        const result = await updateExercise(editingId, payload)
        if (result.error) {
          setError(result.error)
          return
        }
        // Optimistically update local state
        setExercises((prev) =>
          prev.map((ex) => (ex.id === editingId ? { ...ex, ...payload } : ex)),
        )
      } else {
        const result = await createExercise(payload)
        if ('error' in result) {
          setError(result.error)
          return
        }
        setExercises((prev) => [...prev, { id: result.id, ...payload, user_id: null }])
      }

      setShowForm(false)
      setEditingId(null)
    })
  }

  function handleDelete(id: string) {
    if (!confirm(t('confirmDelete'))) return
    startTransition(async () => {
      const result = await deleteExercise(id)
      if (result.error) {
        setError(result.error)
        return
      }
      setExercises((prev) => prev.filter((ex) => ex.id !== id))
    })
  }

  async function handleAddTag(exerciseId: string) {
    const tag = newTagInput.trim()
    if (!tag) {
      setAddingTagForId(null)
      return
    }

    setTagActionPending(true)
    // Optimistic update
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id === exerciseId) {
          const current = ex.tags ?? []
          if (!current.includes(tag)) {
            return { ...ex, tags: [...current, tag] }
          }
        }
        return ex
      }),
    )

    setNewTagInput('')
    setAddingTagForId(null)

    const res = await addExerciseTag(exerciseId, tag)
    if (res.error) {
      setError(res.error)
    }
    setTagActionPending(false)
  }

  async function handleRemoveTag(exerciseId: string, tag: string) {
    setTagActionPending(true)
    // Optimistic update
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            tags: (ex.tags ?? []).filter((t) => t !== tag),
          }
        }
        return ex
      }),
    )

    const res = await removeExerciseTag(exerciseId, tag)
    if (res.error) {
      setError(res.error)
    }
    setTagActionPending(false)
  }

  // Group by category
  const grouped = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    const cat = ex.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(ex)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">{t('title')}</h1>
        <button
          onClick={startNew}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground
                     text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          {t('newExercise')}
        </button>
      </div>

      {/* Exercise Form */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">
            {editingId ? t('editExercise') : t('newExercise')}
          </h2>

          {/* Primary name field (locale-dependent) */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">{t('nameLabel')} *</label>
            <input
              {...form.register(primaryField)}
              placeholder={t('namePlaceholder')}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {form.formState.errors[primaryField] && (
              <p className="text-xs text-destructive">{t('errors.nameRequired')}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Category */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">{t('categoryLabel')} *</label>
              <select
                {...form.register('category')}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {CATEGORIES.map((cat) => (
                  <option
                    key={cat}
                    value={cat}
                    className="bg-card text-foreground dark:bg-slate-900 dark:text-slate-100"
                  >
                    {categoryLabel[cat]}
                  </option>
                ))}
              </select>
            </div>

            {/* Calculation Type */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">{t('calculationTypeLabel')} *</label>
              <select
                {...form.register('calculation_type')}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {CALCULATION_TYPES.map((type) => (
                  <option
                    key={type}
                    value={type}
                    className="bg-card text-foreground dark:bg-slate-900 dark:text-slate-100"
                  >
                    {calcTypeLabel[type]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags input */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">{t('tagsLabel')}</label>
            <input
              {...form.register('tags_text')}
              placeholder={t('tagsPlaceholder')}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Optional translations toggle */}
          <button
            type="button"
            onClick={() => setShowTranslations((p) => !p)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showTranslations ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {t('optionalTranslations')}
          </button>

          {showTranslations && (
            <div className="space-y-2 pl-2 border-l-2 border-border">
              {locale !== 'hu' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t('nameHuLabel')}</label>
                  <input
                    {...form.register('name_hu')}
                    placeholder="pl. Fekvőtámasz"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm
                               focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
              {locale !== 'en' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t('nameEnLabel')}</label>
                  <input
                    {...form.register('name_en')}
                    placeholder="e.g. Push-up"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm
                               focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
              {locale !== 'zh-TW' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t('nameZhLabel')}</label>
                  <input
                    {...form.register('name_zh')}
                    placeholder="伏地挺身"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm
                               focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={form.handleSubmit(onSubmit)}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium
                         disabled:opacity-60 hover:bg-primary/90 transition-colors"
            >
              {isPending ? '...' : t('save')}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium
                         hover:bg-accent transition-colors"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Exercise list grouped by category */}
      {Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Dumbbell className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t('noExercises')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {CATEGORIES.filter((cat) => grouped[cat]?.length).map((cat) => (
            <div key={cat}>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                {categoryLabel[cat]}
              </h2>
              <div className="space-y-2">
                {grouped[cat].map((ex) => {
                  const effectiveTags = getEffectiveExerciseTags(ex, locale)
                  const customTags = ex.tags ?? []
                  const isAdding = addingTagForId === ex.id

                  return (
                    <div
                      key={ex.id}
                      className="rounded-xl bg-card border border-border p-3 space-y-2 hover:border-border/80 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">
                            {getExerciseDisplayName(ex, locale)}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-normal">
                            {calcTypeLabel[getExerciseCalculationType(ex)]}
                          </span>
                        </div>

                        {/* Only show edit/delete for user's own exercises */}
                        {ex.user_id && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEdit(ex)}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground
                                         hover:text-foreground transition-colors"
                              aria-label={t('editExercise')}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(ex.id)}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground
                                         hover:text-destructive transition-colors"
                              aria-label={t('deleteExercise')}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Tags row */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <TagIcon className="h-3 w-3 text-muted-foreground/70 mr-0.5" />
                        {effectiveTags.length === 0 && !isAdding && (
                          <span className="text-xs text-muted-foreground/60 italic">
                            尚無標籤
                          </span>
                        )}

                        {effectiveTags.map((tag) => {
                          const isCustom = customTags.includes(tag)
                          return (
                            <span
                              key={tag}
                              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                                isCustom
                                  ? 'bg-primary/10 border-primary/20 text-primary font-medium'
                                  : 'bg-muted/70 border-border text-muted-foreground'
                              }`}
                            >
                              {tag}
                              {isCustom && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTag(ex.id, tag)}
                                  disabled={tagActionPending}
                                  className="hover:text-destructive transition-colors rounded p-0.5"
                                  title="移除標籤"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              )}
                            </span>
                          )
                        })}

                        {/* Add tag button / input */}
                        {isAdding ? (
                          <div className="inline-flex items-center gap-1 bg-background border border-primary/50 rounded-full px-2 py-0.5">
                            <input
                              type="text"
                              value={newTagInput}
                              onChange={(e) => setNewTagInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  handleAddTag(ex.id)
                                } else if (e.key === 'Escape') {
                                  setAddingTagForId(null)
                                  setNewTagInput('')
                                }
                              }}
                              placeholder={t('enterTagPlaceholder')}
                              className="text-xs bg-transparent border-none outline-none w-24 text-foreground placeholder:text-muted-foreground/60"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleAddTag(ex.id)}
                              disabled={tagActionPending}
                              className="text-primary hover:text-primary/80 transition-colors"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAddingTagForId(null)
                                setNewTagInput('')
                              }}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setAddingTagForId(ex.id)
                              setNewTagInput('')
                            }}
                            className="inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full border border-dashed border-border
                                       text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                          >
                            <Plus className="h-2.5 w-2.5" />
                            {t('addTag')}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
