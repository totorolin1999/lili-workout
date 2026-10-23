'use client'

import { useState, useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Search, X, Check, Dumbbell } from 'lucide-react'
import {
  getExerciseDisplayName,
  getExerciseCalculationType,
  getEffectiveExerciseTags,
  type Exercise,
  type Locale,
  type CalculationType,
} from '@/lib/exercises'
import { cn } from '@/lib/utils'

const CATEGORIES = ['legs', 'chest', 'back', 'shoulders', 'arms', 'core', 'cardio', 'other'] as const
type Category = (typeof CATEGORIES)[number]

interface ExerciseSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (exercise: Exercise) => void
  exercises: Exercise[]
  selectedExerciseId?: string
  locale: Locale
}

export default function ExerciseSelectorModal({
  isOpen,
  onClose,
  onSelect,
  exercises,
  selectedExerciseId,
  locale,
}: ExerciseSelectorModalProps) {
  const t = useTranslations('workout')
  const tEx = useTranslations('exercises')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Reset search & category when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setSelectedCategory('all')
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

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

  const calcTypeLabel: Record<CalculationType, string> = {
    weight_reps: t('calculationType.weight_reps'),
    reps: t('calculationType.reps'),
    duration: t('calculationType.duration'),
    distance_duration: t('calculationType.distance_duration'),
    reps_duration: t('calculationType.reps_duration'),
  }

  // Filter exercises
  const filteredExercises = useMemo(() => {
    const q = search.trim().toLowerCase()
    return exercises.filter((ex) => {
      if (selectedCategory !== 'all' && ex.category !== selectedCategory) {
        return false
      }
      if (!q) return true

      const nameHu = (ex.name_hu ?? '').toLowerCase()
      const nameEn = (ex.name_en ?? '').toLowerCase()
      const nameZh = (ex.name_zh ?? '').toLowerCase()
      const displayName = getExerciseDisplayName(ex, locale).toLowerCase()
      const catName = categoryLabel[ex.category as Category]?.toLowerCase() ?? ''
      const tags = getEffectiveExerciseTags(ex, locale)
      const matchesTag = tags.some((t) => t.toLowerCase().includes(q))

      return (
        displayName.includes(q) ||
        nameZh.includes(q) ||
        nameEn.includes(q) ||
        nameHu.includes(q) ||
        catName.includes(q) ||
        matchesTag
      )
    })
  }, [exercises, search, selectedCategory, locale, categoryLabel])

  // Group by category
  const grouped = useMemo(() => {
    return filteredExercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
      const cat = ex.category || 'other'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(ex)
      return acc
    }, {})
  }, [filteredExercises])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      {/* Modal Card */}
      <div className="w-full sm:max-w-lg bg-card border border-border sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{t('selectExercise')}</h2>
              <p className="text-xs text-muted-foreground">{exercises.length} {tEx('title')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 pb-2 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchExercise')}
              autoFocus
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-background text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex gap-1.5 overflow-x-auto pt-3 pb-1 no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors flex-shrink-0',
                selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
              )}
            >
              {t('allCategories')}
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors flex-shrink-0',
                  selectedCategory === cat
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                )}
              >
                {categoryLabel[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Exercises List (Grouped like Exercise Library) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {filteredExercises.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm space-y-1">
              <p className="font-medium">{t('noExercisesFound')}</p>
              <p className="text-xs text-muted-foreground/80">
                {search ? `"${search}"` : ''}
              </p>
            </div>
          ) : (
            CATEGORIES.filter((cat) => grouped[cat]?.length).map((cat) => (
              <div key={cat} className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {categoryLabel[cat]}
                  </h3>
                  <span className="text-[11px] text-muted-foreground/70">
                    {grouped[cat].length}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-1">
                  {grouped[cat].map((ex) => {
                    const isSelected = ex.id === selectedExerciseId
                    const calcType = getExerciseCalculationType(ex)
                    const displayName = getExerciseDisplayName(ex, locale)
                    const tags = getEffectiveExerciseTags(ex, locale)

                    return (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => {
                          onSelect(ex)
                          onClose()
                        }}
                        className={cn(
                          'w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all',
                          isSelected
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-background hover:bg-muted/60 border-border/80 text-foreground',
                        )}
                      >
                        <div className="flex flex-col gap-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm truncate">
                              {displayName}
                            </span>
                            {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                          </div>
                          {tags.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {tags.slice(0, 4).map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground"
                                >
                                  {tag}
                                </span>
                              ))}
                              {tags.length > 4 && (
                                <span className="text-[10px] text-muted-foreground/70">
                                  +{tags.length - 4}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium flex-shrink-0 self-start mt-0.5">
                          {calcTypeLabel[calcType]}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
