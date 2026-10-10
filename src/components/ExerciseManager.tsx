'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Plus, ChevronDown, ChevronUp, Pencil, Trash2, Dumbbell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getExerciseDisplayName, getPrimaryNameField, type Exercise, type Locale } from '@/lib/exercises'
import { createExercise, updateExercise, deleteExercise } from '@/lib/actions/exercise'

// ─── Types & Schema ──────────────────────────────────────────────────────────

const CATEGORIES = ['legs', 'chest', 'back', 'shoulders', 'arms', 'core', 'cardio', 'other'] as const
type Category = (typeof CATEGORIES)[number]

const ExerciseFormSchema = z.object({
  name_hu: z.string().max(200).optional(),
  name_en: z.string().max(200).optional(),
  name_zh: z.string().max(200).optional(),
  category: z.enum(CATEGORIES),
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

  const primaryField = getPrimaryNameField(locale)

  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(ExerciseFormSchema),
    defaultValues: { name_hu: '', name_en: '', name_zh: '', category: 'legs' },
  })

  const categoryLabel: Record<Category, string> = {
    legs: t('categories.legs'),
    chest: t('categories.chest'),
    back: t('categories.back'),
    shoulders: t('categories.shoulders'),
    arms: t('categories.arms'),
    core: t('categories.core'),
    cardio: t('categories.cardio'),
    other: t('categories.other'),
  }

  function startNew() {
    form.reset({ name_hu: '', name_en: '', name_zh: '', category: 'legs' })
    setEditingId(null)
    setShowForm(true)
    setError(null)
  }

  function startEdit(ex: Exercise) {
    form.reset({
      name_hu: ex.name_hu ?? '',
      name_en: ex.name_en ?? '',
      name_zh: ex.name_zh ?? '',
      category: ex.category as Category,
    })
    setEditingId(ex.id)
    setShowForm(true)
    setError(null)
  }

  function onSubmit(values: ExerciseFormValues) {
    setError(null)
    startTransition(async () => {
      const payload = {
        name_hu: values.name_hu || null,
        name_en: values.name_en || null,
        name_zh: values.name_zh || null,
        category: values.category,
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
                     text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('newExercise')}
        </button>
      </div>

      {/* Exercise Form */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
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

          {/* Category */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">{t('categoryLabel')} *</label>
            <select
              {...form.register('category')}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{categoryLabel[cat]}</option>
              ))}
            </select>
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
                  <label className="text-xs font-medium text-muted-foreground">{t('nameEnLabel')}</label>
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
              <div className="space-y-1">
                {grouped[cat].map((ex) => (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between px-4 py-3 rounded-xl
                               bg-card border border-border"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {getExerciseDisplayName(ex, locale)}
                    </span>
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
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
