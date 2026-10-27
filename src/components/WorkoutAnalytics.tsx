'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { PieChart, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/exercises'
import type { WorkoutHistoryEntry } from '@/lib/actions/workout'

interface WorkoutAnalyticsProps {
  workouts: WorkoutHistoryEntry[]
  locale?: Locale
}

type TimeRange = 'week' | 'month' | 'all'

interface CategoryItem {
  category: string
  count: number
  percentage: number
  color: string
}

const CATEGORY_COLORS: Record<string, string> = {
  legs: '#3b82f6', // blue-500
  glutes: '#ec4899', // pink-500
  chest: '#f43f5e', // rose-500
  back: '#10b981', // emerald-500
  shoulders: '#f59e0b', // amber-500
  arms: '#8b5cf6', // purple-500
  core: '#6366f1', // indigo-500
  cardio: '#06b6d4', // cyan-500
  other: '#71717a', // zinc-500
}

export default function WorkoutAnalytics({ workouts }: WorkoutAnalyticsProps) {
  const tHistory = useTranslations('history')
  const tExercises = useTranslations('exercises')

  const [timeRange, setTimeRange] = useState<TimeRange>('month')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // ─── 1. Filter workouts by Time Range ─────────────────────────────────────
  const filteredWorkouts = useMemo(() => {
    if (timeRange === 'all') return workouts

    const now = new Date()
    if (timeRange === 'week') {
      const day = now.getDay()
      const diffToMonday = day === 0 ? -6 : 1 - day
      const monday = new Date(now)
      monday.setDate(now.getDate() + diffToMonday)
      const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
      return workouts.filter((w) => w.date >= mondayStr)
    }

    if (timeRange === 'month') {
      const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      return workouts.filter((w) => w.date.startsWith(monthPrefix))
    }

    return workouts
  }, [workouts, timeRange])

  // ─── 2. Calculate Category Breakdown ──────────────────────────────────────
  const { categoryStats, totalSets } = useMemo(() => {
    const map = new Map<string, number>()
    let total = 0

    for (const w of filteredWorkouts) {
      for (const s of w.workout_sets ?? []) {
        const related = s.exercises
        const ex = Array.isArray(related) ? related[0] : related
        const cat = ex?.category ?? 'other'
        map.set(cat, (map.get(cat) ?? 0) + 1)
        total++
      }
    }

    if (total === 0) {
      return { categoryStats: [], totalSets: 0 }
    }

    const stats: CategoryItem[] = Array.from(map.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / total) * 100),
        color: CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other,
      }))
      .sort((a, b) => b.count - a.count)

    return { categoryStats: stats, totalSets: total }
  }, [filteredWorkouts])

  // ─── 3. Donut Chart Geometry (SVG) ────────────────────────────────────────
  const RADIUS = 68
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS

  const donutSegments = useMemo(() => {
    let accumulatedOffset = 0
    return categoryStats.map((item) => {
      const segmentLength = (item.count / totalSets) * CIRCUMFERENCE
      const offset = accumulatedOffset
      accumulatedOffset += segmentLength
      return {
        ...item,
        strokeDasharray: `${segmentLength} ${CIRCUMFERENCE - segmentLength}`,
        strokeDashoffset: -offset,
      }
    })
  }, [categoryStats, totalSets, CIRCUMFERENCE])

  // Focused category for center label
  const activeItem = useMemo(() => {
    if (!activeCategory) return null
    return categoryStats.find((c) => c.category === activeCategory) ?? null
  }, [activeCategory, categoryStats])

  function getCategoryLabel(categoryKey: string): string {
    try {
      return tExercises(`categories.${categoryKey}`)
    } catch {
      return categoryKey
    }
  }

  return (
    <div className="space-y-4">
      {/* ─── Header & Time Range Filter ──────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 p-1">
        <div className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">
            {tHistory('muscleDistribution')}
          </h2>
        </div>

        {/* Time Range Segmented Control */}
        <div className="inline-flex items-center p-0.5 rounded-xl bg-muted border border-border text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setTimeRange('week')
              setActiveCategory(null)
            }}
            className={cn(
              'px-2.5 py-1 rounded-lg transition-all',
              timeRange === 'week'
                ? 'bg-card text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tHistory('timeRangeThisWeek')}
          </button>
          <button
            type="button"
            onClick={() => {
              setTimeRange('month')
              setActiveCategory(null)
            }}
            className={cn(
              'px-2.5 py-1 rounded-lg transition-all',
              timeRange === 'month'
                ? 'bg-card text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tHistory('timeRangeThisMonth')}
          </button>
          <button
            type="button"
            onClick={() => {
              setTimeRange('all')
              setActiveCategory(null)
            }}
            className={cn(
              'px-2.5 py-1 rounded-lg transition-all',
              timeRange === 'all'
                ? 'bg-card text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tHistory('timeRangeAll')}
          </button>
        </div>
      </div>

      {/* ─── Donut Chart & Legend Card ────────────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-card border border-border shadow-xs">
        {totalSets === 0 ? (
          <div className="py-12 px-4 text-center space-y-2">
            <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto" />
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              {tHistory('noDataInRange')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8">
            {/* SVG Donut Chart */}
            <div className="relative w-48 h-48 flex-shrink-0">
              <svg
                viewBox="0 0 200 200"
                className="w-full h-full transform -rotate-90 select-none"
              >
                {/* Background Ring */}
                <circle
                  cx="100"
                  cy="100"
                  r={RADIUS}
                  className="stroke-muted/40"
                  strokeWidth="22"
                  fill="none"
                />

                {/* Donut Segments */}
                {donutSegments.map((segment) => {
                  const isHovered = activeCategory === segment.category
                  return (
                    <circle
                      key={segment.category}
                      cx="100"
                      cy="100"
                      r={RADIUS}
                      stroke={segment.color}
                      strokeWidth={isHovered ? 26 : 22}
                      strokeDasharray={segment.strokeDasharray}
                      strokeDashoffset={segment.strokeDashoffset}
                      fill="none"
                      className="cursor-pointer transition-all duration-200"
                      opacity={activeCategory && !isHovered ? 0.35 : 1}
                      onMouseEnter={() => setActiveCategory(segment.category)}
                      onMouseLeave={() => setActiveCategory(null)}
                      onClick={() =>
                        setActiveCategory(
                          activeCategory === segment.category ? null : segment.category,
                        )
                      }
                    />
                  )
                })}
              </svg>

              {/* Center Info Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                {activeItem ? (
                  <>
                    <span className="text-xs font-semibold text-muted-foreground truncate max-w-[90px]">
                      {getCategoryLabel(activeItem.category)}
                    </span>
                    <span className="text-xl font-black text-foreground tracking-tight">
                      {activeItem.percentage}%
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {activeItem.count} {tHistory('sets')}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {tHistory('totalSets')}
                    </span>
                    <span className="text-2xl font-black text-foreground tracking-tight">
                      {totalSets}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {tHistory('sets')}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Muscle Groups Legend List */}
            <div className="w-full sm:max-w-xs space-y-2">
              {categoryStats.map((item) => {
                const isHovered = activeCategory === item.category
                return (
                  <div
                    key={item.category}
                    className={cn(
                      'flex items-center justify-between p-2 rounded-xl text-xs transition-colors cursor-pointer',
                      isHovered
                        ? 'bg-muted/80 shadow-2xs'
                        : 'hover:bg-muted/40',
                    )}
                    onMouseEnter={() => setActiveCategory(item.category)}
                    onMouseLeave={() => setActiveCategory(null)}
                    onClick={() =>
                      setActiveCategory(
                        activeCategory === item.category ? null : item.category,
                      )
                    }
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform"
                        style={{
                          backgroundColor: item.color,
                          transform: isHovered ? 'scale(1.25)' : 'scale(1)',
                        }}
                      />
                      <span className="font-semibold text-foreground">
                        {getCategoryLabel(item.category)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-right font-mono">
                      <span className="text-muted-foreground text-[11px]">
                        {item.count} {tHistory('sets')}
                      </span>
                      <span className="font-bold text-foreground w-9">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
