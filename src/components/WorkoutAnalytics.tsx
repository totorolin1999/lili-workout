'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  BarChart3,
  PieChart,
  Calendar as CalendarIcon,
  Dumbbell,
  Trophy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/exercises'
import type { WorkoutHistoryEntry } from '@/lib/actions/workout'

interface WorkoutAnalyticsProps {
  workouts: WorkoutHistoryEntry[]
  locale: Locale
}

const CATEGORY_COLORS: Record<string, { bar: string }> = {
  legs: { bar: 'bg-blue-500' },
  chest: { bar: 'bg-rose-500' },
  back: { bar: 'bg-emerald-500' },
  shoulders: { bar: 'bg-amber-500' },
  arms: { bar: 'bg-purple-500' },
  core: { bar: 'bg-indigo-500' },
  cardio: { bar: 'bg-cyan-500' },
  other: { bar: 'bg-zinc-500' },
}

export default function WorkoutAnalytics({
  workouts,
}: WorkoutAnalyticsProps) {
  const tHistory = useTranslations('history')
  const tExercises = useTranslations('exercises')

  // ─── 1. Summary Overview ──────────────────────────────────────────────────
  const summary = useMemo(() => {
    let totalSets = 0
    const now = new Date()
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const activeDatesThisMonth = new Set<string>()

    for (const w of workouts) {
      if (w.date.startsWith(currentYearMonth)) {
        activeDatesThisMonth.add(w.date)
      }
      totalSets += w.workout_sets?.length ?? 0
    }

    return {
      totalWorkouts: workouts.length,
      totalSets,
      activeDaysThisMonth: activeDatesThisMonth.size,
    }
  }, [workouts])

  // ─── 2. Weekly Workout Frequency (Last 8 Weeks) ───────────────────────────
  const weeklyData = useMemo(() => {
    const weeks: { weekLabel: string; count: number; isCurrentWeek: boolean }[] = []
    const today = new Date()
    const currentDayOfWeek = today.getDay() // 0 = Sun, 1 = Mon...
    const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek
    const currentMonday = new Date(today)
    currentMonday.setDate(today.getDate() + diffToMonday)
    currentMonday.setHours(0, 0, 0, 0)

    for (let i = 7; i >= 0; i--) {
      const mon = new Date(currentMonday)
      mon.setDate(currentMonday.getDate() - i * 7)
      const sun = new Date(mon)
      sun.setDate(mon.getDate() + 6)
      sun.setHours(23, 59, 59, 999)

      const monStr = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`
      const sunStr = `${sun.getFullYear()}-${String(sun.getMonth() + 1).padStart(2, '0')}-${String(sun.getDate()).padStart(2, '0')}`

      const daysInWeek = new Set<string>()
      for (const w of workouts) {
        if (w.date >= monStr && w.date <= sunStr) {
          daysInWeek.add(w.date)
        }
      }

      const label = `${mon.getMonth() + 1}/${mon.getDate()}`
      weeks.push({
        weekLabel: label,
        count: daysInWeek.size,
        isCurrentWeek: i === 0,
      })
    }

    return weeks
  }, [workouts])

  // ─── 3. Muscle Group / Category Breakdown ──────────────────────────────────
  const categoryStats = useMemo(() => {
    const map = new Map<string, number>()
    let totalValidSets = 0

    for (const w of workouts) {
      for (const s of w.workout_sets ?? []) {
        const related = s.exercises
        const ex = Array.isArray(related) ? related[0] : related
        const cat = ex?.category ?? 'other'
        map.set(cat, (map.get(cat) ?? 0) + 1)
        totalValidSets++
      }
    }

    if (totalValidSets === 0) return []

    return Array.from(map.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / totalValidSets) * 100),
      }))
      .sort((a, b) => b.count - a.count)
  }, [workouts])

  return (
    <div className="space-y-4">
      {/* ─── 1. Quick KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">{tHistory('totalWorkouts')}</span>
            <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Dumbbell className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-foreground tracking-tight">
              {summary.totalWorkouts}
            </span>
            <span className="text-xs text-muted-foreground ml-1">{tHistory('timesUnit')}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">{tHistory('activeDaysThisMonth')}</span>
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <CalendarIcon className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-foreground tracking-tight">
              {summary.activeDaysThisMonth}
            </span>
            <span className="text-xs text-muted-foreground ml-1">{tHistory('workoutDayUnit')}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">{tHistory('totalSetsCompleted')}</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Trophy className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-foreground tracking-tight">
              {summary.totalSets}
            </span>
            <span className="text-xs text-muted-foreground ml-1">{tHistory('sets')}</span>
          </div>
        </div>
      </div>

      {/* ─── 2. Weekly Consistency Bar Chart ───────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              {tHistory('weeklyFrequency')}
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {tHistory('weeklyTarget', { target: 3 })}
          </span>
        </div>

        {/* Bar chart grid */}
        <div className="pt-2">
          <div className="relative h-32 flex items-end justify-between gap-1.5 sm:gap-2 px-1 border-b border-border/80">
            {/* Target Line: 3 days / week */}
            <div
              className="absolute left-0 right-0 border-b border-dashed border-primary/40 pointer-events-none flex items-center justify-end pr-1 z-0"
              style={{ bottom: `${(3 / 7) * 100}%` }}
            >
              <span className="text-[10px] text-primary/70 font-medium bg-card px-1">
                3 {tHistory('workoutDayUnit')}
              </span>
            </div>

            {weeklyData.map((wk, idx) => {
              const heightPct = Math.min(100, Math.max(8, (wk.count / 7) * 100))
              const meetsTarget = wk.count >= 3
              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center h-full justify-end group relative z-10"
                >
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 px-2 py-0.5 rounded-lg bg-popover text-popover-foreground text-[10px] font-semibold shadow-md whitespace-nowrap pointer-events-none z-20 border border-border">
                    {wk.count} {tHistory('workoutDayUnit')}
                  </div>

                  <span className="text-[10px] font-bold text-foreground mb-1">
                    {wk.count > 0 ? wk.count : ''}
                  </span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={cn(
                      'w-full max-w-[28px] rounded-t-md transition-all duration-300',
                      wk.count === 0
                        ? 'bg-muted/40'
                        : meetsTarget
                          ? 'bg-primary group-hover:brightness-110 shadow-xs'
                          : 'bg-primary/50 group-hover:bg-primary/70',
                      wk.isCurrentWeek && 'ring-2 ring-primary ring-offset-1 ring-offset-card',
                    )}
                  />
                </div>
              )
            })}
          </div>

          {/* Week Labels */}
          <div className="flex justify-between gap-1.5 sm:gap-2 px-1 pt-1.5 text-[10px] text-muted-foreground font-medium">
            {weeklyData.map((wk, idx) => (
              <span
                key={idx}
                className={cn('flex-1 text-center truncate', wk.isCurrentWeek && 'text-primary font-bold')}
              >
                {wk.weekLabel}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ─── 3. Muscle Group Training Distribution ──────────────────────────── */}
      {categoryStats.length > 0 && (
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                {tHistory('muscleDistribution')}
              </h2>
            </div>
          </div>

          <div className="space-y-3">
            {categoryStats.map(({ category, count, percentage }) => {
              const color = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other
              let categoryLabel = category
              try {
                categoryLabel = tExercises(`categories.${category}`)
              } catch {
                categoryLabel = category
              }

              return (
                <div key={category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <span className={cn('w-2 h-2 rounded-full', color.bar)} />
                      {categoryLabel}
                    </span>
                    <span className="text-muted-foreground font-mono">
                      {count} {tHistory('sets')} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      style={{ width: `${percentage}%` }}
                      className={cn('h-full rounded-full transition-all duration-500', color.bar)}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
