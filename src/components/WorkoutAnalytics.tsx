'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  TrendingUp,
  Dumbbell,
  Flame,
  Calendar as CalendarIcon,
  Trophy,
  Award,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getExerciseDisplayName,
  type Exercise,
  type Locale,
} from '@/lib/exercises'
import type { WorkoutHistoryEntry, WorkoutHistorySet } from '@/lib/actions/workout'
import { formatDate } from './WorkoutCard'

interface WorkoutAnalyticsProps {
  workouts: WorkoutHistoryEntry[]
  exercises?: Exercise[]
  locale: Locale
  selectedExerciseId?: string | null
  onSelectExercise?: (id: string) => void
}

type MetricType = 'max_weight' | 'volume' | 'estimated_1rm' | 'max_reps' | 'distance' | 'duration'
type TimeRange = 'all' | '6m' | '3m'

interface ChartDataPoint {
  workoutId: string
  date: string
  formattedDate: string
  value: number
  isPR: boolean
  sets: WorkoutHistorySet[]
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  legs: { bg: 'bg-blue-500/10', text: 'text-blue-500', bar: 'bg-blue-500' },
  chest: { bg: 'bg-rose-500/10', text: 'text-rose-500', bar: 'bg-rose-500' },
  back: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', bar: 'bg-emerald-500' },
  shoulders: { bg: 'bg-amber-500/10', text: 'text-amber-500', bar: 'bg-amber-500' },
  arms: { bg: 'bg-purple-500/10', text: 'text-purple-500', bar: 'bg-purple-500' },
  core: { bg: 'bg-indigo-500/10', text: 'text-indigo-500', bar: 'bg-indigo-500' },
  cardio: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', bar: 'bg-cyan-500' },
  other: { bg: 'bg-zinc-500/10', text: 'text-zinc-500', bar: 'bg-zinc-500' },
}

export default function WorkoutAnalytics({
  workouts,
  exercises = [],
  locale,
  selectedExerciseId: externalSelectedExerciseId,
  onSelectExercise,
}: WorkoutAnalyticsProps) {
  const tHistory = useTranslations('history')
  const tExercises = useTranslations('exercises')
  const tWorkout = useTranslations('workout')

  // ─── 1. Summary KPIs ────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    let totalSets = 0
    let totalVolumeKg = 0
    const now = new Date()
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const activeDatesThisMonth = new Set<string>()

    for (const w of workouts) {
      if (w.date.startsWith(currentYearMonth)) {
        activeDatesThisMonth.add(w.date)
      }
      for (const s of w.workout_sets ?? []) {
        totalSets++
        const weight = s.weight_kg ?? 0
        const reps = s.reps ?? 0
        if (weight > 0 && reps > 0) {
          totalVolumeKg += weight * reps
        }
      }
    }

    return {
      totalWorkouts: workouts.length,
      totalSets,
      totalVolumeKg: Math.round(totalVolumeKg),
      activeDaysThisMonth: activeDatesThisMonth.size,
    }
  }, [workouts])

  // ─── 2. Weekly Workout Frequency (Last 8 Weeks) ────────────────────────────
  const weeklyData = useMemo(() => {
    const weeks: { weekLabel: string; count: number; isCurrentWeek: boolean }[] = []
    const today = new Date()
    // Align to Monday of current week
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

  // ─── 3. Available Exercises in History ──────────────────────────────────────
  const availableExercises = useMemo(() => {
    const countMap = new Map<string, { exercise: Exercise; count: number }>()

    for (const w of workouts) {
      for (const s of w.workout_sets ?? []) {
        const related = s.exercises
        const ex = Array.isArray(related) ? related[0] : related
        const id = s.exercise_id
        if (!countMap.has(id)) {
          const matched = exercises.find((item) => item.id === id)
          const exerciseObj: Exercise = matched ?? (ex ? ({ ...ex, user_id: null } as Exercise) : {
            id,
            name_en: null,
            name_hu: null,
            name_zh: null,
            category: 'other',
            user_id: null,
          })
          countMap.set(id, { exercise: exerciseObj, count: 1 })
        } else {
          const entry = countMap.get(id)!
          entry.count++
        }
      }
    }

    return Array.from(countMap.values())
      .sort((a, b) => b.count - a.count)
      .map((item) => item.exercise)
  }, [workouts, exercises])

  const [internalSelectedId, setInternalSelectedId] = useState<string>(() => {
    return availableExercises[0]?.id ?? ''
  })

  const currentExerciseId = externalSelectedExerciseId ?? internalSelectedId

  function handleExerciseChange(id: string) {
    setInternalSelectedId(id)
    if (onSelectExercise) {
      onSelectExercise(id)
    }
  }

  const selectedExercise = useMemo(() => {
    return availableExercises.find((e) => e.id === currentExerciseId) ?? availableExercises[0]
  }, [availableExercises, currentExerciseId])

  // ─── 4. Metric & Time Range State ──────────────────────────────────────────
  const [metric, setMetric] = useState<MetricType>('max_weight')
  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null)

  // ─── 5. Exercise Progress Points ───────────────────────────────────────────
  const { chartPoints, hasWeightData, allTimePR, growthRate } = useMemo(() => {
    if (!selectedExercise) {
      return { chartPoints: [], hasWeightData: false, allTimePR: 0, growthRate: null }
    }

    const exId = selectedExercise.id
    // Filter workouts containing this exercise
    const relevantWorkouts = workouts
      .filter((w) => w.workout_sets?.some((s) => s.exercise_id === exId))
      .sort((a, b) => a.date.localeCompare(b.date)) // chronological

    let detectedHasWeight = false

    // Determine PR across all time
    let prVal = 0
    const rawPoints: {
      workoutId: string
      date: string
      formattedDate: string
      value: number
      sets: WorkoutHistorySet[]
    }[] = []

    for (const w of relevantWorkouts) {
      const sets = (w.workout_sets ?? []).filter((s) => s.exercise_id === exId)
      if (sets.length === 0) continue

      let val = 0
      for (const s of sets) {
        if (s.weight_kg != null && Number(s.weight_kg) > 0) {
          detectedHasWeight = true
        }
      }

      if (metric === 'max_weight') {
        val = Math.max(...sets.map((s) => Number(s.weight_kg ?? 0)), 0)
      } else if (metric === 'volume') {
        val = sets.reduce((sum, s) => sum + (Number(s.weight_kg ?? 0) * Number(s.reps ?? 0)), 0)
      } else if (metric === 'estimated_1rm') {
        val = Math.max(
          ...sets.map((s) => {
            const wKg = Number(s.weight_kg ?? 0)
            const r = Number(s.reps ?? 0)
            if (wKg > 0 && r > 0) {
              return Math.round(wKg * (1 + r / 30))
            }
            return wKg
          }),
          0,
        )
      } else if (metric === 'max_reps') {
        val = Math.max(...sets.map((s) => Number(s.reps ?? 0)), 0)
      } else if (metric === 'distance') {
        val = sets.reduce((sum, s) => sum + Number(s.distance_km ?? 0), 0)
      } else if (metric === 'duration') {
        val = sets.reduce((sum, s) => sum + Number(s.duration_seconds ?? 0), 0)
      }

      if (val > prVal) {
        prVal = val
      }

      rawPoints.push({
        workoutId: w.id,
        date: w.date,
        formattedDate: formatDate(w.date, locale),
        value: val,
        sets,
      })
    }

    // Filter by time range
    const now = new Date()
    let cutoffDate = ''
    if (timeRange === '3m') {
      const d = new Date(now)
      d.setMonth(d.getMonth() - 3)
      cutoffDate = d.toISOString().split('T')[0]
    } else if (timeRange === '6m') {
      const d = new Date(now)
      d.setMonth(d.getMonth() - 6)
      cutoffDate = d.toISOString().split('T')[0]
    }

    const filtered = cutoffDate
      ? rawPoints.filter((p) => p.date >= cutoffDate)
      : rawPoints

    const points: ChartDataPoint[] = filtered.map((p) => ({
      ...p,
      isPR: p.value > 0 && p.value === prVal,
    }))

    // Calculate growth rate comparing first to last point
    let growth: { diff: number; percent: number } | null = null
    if (points.length >= 2) {
      const first = points[0].value
      const last = points[points.length - 1].value
      if (first > 0) {
        const diff = last - first
        const percent = Math.round((diff / first) * 100)
        growth = { diff, percent }
      }
    }

    return {
      chartPoints: points,
      hasWeightData: detectedHasWeight,
      allTimePR: prVal,
      growthRate: growth,
    }
  }, [workouts, selectedExercise, metric, timeRange, locale])

  // ─── 6. Category Distribution ──────────────────────────────────────────────
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

  // SVG Chart Dimensions
  const svgWidth = 520
  const svgHeight = 220
  const pad = { top: 25, right: 30, bottom: 40, left: 50 }
  const innerW = svgWidth - pad.left - pad.right
  const innerH = svgHeight - pad.top - pad.bottom

  const { pathD, areaD, plottedPoints, yTicks } = useMemo(() => {
    if (chartPoints.length === 0) {
      return { pathD: '', areaD: '', plottedPoints: [], yTicks: [] }
    }

    const values = chartPoints.map((p) => p.value)
    const maxVal = Math.max(...values, 10)
    const minVal = Math.min(...values, 0)
    const valRange = maxVal === minVal ? 10 : maxVal - minVal

    // Generate 4 Y-ticks
    const ticks = [
      Math.round(minVal),
      Math.round(minVal + valRange * 0.33),
      Math.round(minVal + valRange * 0.66),
      Math.round(maxVal),
    ]

    const pts = chartPoints.map((pt, i) => {
      const x =
        chartPoints.length === 1
          ? pad.left + innerW / 2
          : pad.left + (i / (chartPoints.length - 1)) * innerW
      const y = pad.top + innerH - ((pt.value - minVal) / valRange) * innerH
      return { ...pt, x, y }
    })

    const lineCommands = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ')
    const firstPt = pts[0]
    const lastPt = pts[pts.length - 1]
    const areaCommands = `${lineCommands} L ${lastPt.x.toFixed(1)} ${(pad.top + innerH).toFixed(1)} L ${firstPt.x.toFixed(1)} ${(pad.top + innerH).toFixed(1)} Z`

    return {
      pathD: lineCommands,
      areaD: areaCommands,
      plottedPoints: pts,
      yTicks: ticks,
    }
  }, [chartPoints, innerW, innerH, pad.left, pad.top])

  const metricUnit = useMemo(() => {
    if (metric === 'max_weight' || metric === 'volume' || metric === 'estimated_1rm') return tWorkout('kg')
    if (metric === 'max_reps') return tWorkout('reps')
    if (metric === 'distance') return 'km'
    if (metric === 'duration') return 's'
    return ''
  }, [metric, tWorkout])

  return (
    <div className="space-y-6">
      {/* ─── 1. Top KPI Summary Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">{tHistory('totalWorkouts')}</span>
            <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Dumbbell className="h-4 w-4" />
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
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">{tHistory('totalVolume')}</span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-foreground tracking-tight">
              {summary.totalVolumeKg >= 10000
                ? `${(summary.totalVolumeKg / 1000).toFixed(1)}t`
                : `${summary.totalVolumeKg.toLocaleString()}`}
            </span>
            {summary.totalVolumeKg < 10000 && (
              <span className="text-xs text-muted-foreground ml-1">{tWorkout('kg')}</span>
            )}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">{tHistory('activeDaysThisMonth')}</span>
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <CalendarIcon className="h-4 w-4" />
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
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">{tHistory('totalSetsCompleted')}</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Trophy className="h-4 w-4" />
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
          <div className="relative h-32 flex items-end justify-between gap-1 sm:gap-2 px-1 border-b border-border/80">
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
          <div className="flex justify-between gap-1 sm:gap-2 px-1 pt-1.5 text-[10px] text-muted-foreground font-medium">
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

      {/* ─── 3. Exercise Progress Line Chart ────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-4">
        {/* Header with Exercise Selector & Time Range */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              {tHistory('exerciseProgress')}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Exercise Selector */}
            <select
              value={selectedExercise?.id ?? ''}
              onChange={(e) => handleExerciseChange(e.target.value)}
              className="text-xs font-medium rounded-xl border border-border bg-muted/60 px-2.5 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 cursor-pointer max-w-[180px] truncate"
            >
              {availableExercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {getExerciseDisplayName(ex, locale)}
                </option>
              ))}
            </select>

            {/* Time Range Pills */}
            <div className="inline-flex items-center p-0.5 rounded-xl bg-muted border border-border text-[11px] font-semibold">
              {(['all', '6m', '3m'] as TimeRange[]).map((tr) => (
                <button
                  key={tr}
                  type="button"
                  onClick={() => setTimeRange(tr)}
                  className={cn(
                    'px-2 py-1 rounded-lg transition-all',
                    timeRange === tr
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tr === 'all' && tHistory('timeRangeAll')}
                  {tr === '6m' && tHistory('timeRange6M')}
                  {tr === '3m' && tHistory('timeRange3M')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Metric Switcher Tabs */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {hasWeightData ? (
            <>
              <button
                type="button"
                onClick={() => setMetric('max_weight')}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-all border',
                  metric === 'max_weight'
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground',
                )}
              >
                {tHistory('metricMaxWeight')}
              </button>
              <button
                type="button"
                onClick={() => setMetric('volume')}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-all border',
                  metric === 'volume'
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground',
                )}
              >
                {tHistory('metricVolume')}
              </button>
              <button
                type="button"
                onClick={() => setMetric('estimated_1rm')}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-all border',
                  metric === 'estimated_1rm'
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground',
                )}
              >
                {tHistory('metricEstimated1RM')}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setMetric('max_reps')}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-all border',
                  metric === 'max_reps'
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground',
                )}
              >
                {tHistory('metricMaxReps')}
              </button>
              <button
                type="button"
                onClick={() => setMetric('distance')}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-all border',
                  metric === 'distance'
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground',
                )}
              >
                {tHistory('metricTotalDistance')}
              </button>
              <button
                type="button"
                onClick={() => setMetric('duration')}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-all border',
                  metric === 'duration'
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground',
                )}
              >
                {tHistory('metricTotalDuration')}
              </button>
            </>
          )}
        </div>

        {/* PR and Growth Highlights Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <Award className="h-4 w-4 text-amber-500" />
              <span>{tHistory('personalRecord')}:</span>
            </span>
            <span className="font-black text-amber-500">
              {allTimePR} {metricUnit}
            </span>
          </div>

          {growthRate && (
            <div className="flex items-center gap-1 font-semibold">
              <span className="text-muted-foreground">{tHistory('progressImprovement')}:</span>
              <span
                className={cn(
                  'inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px]',
                  growthRate.diff > 0
                    ? 'text-emerald-500 bg-emerald-500/10'
                    : growthRate.diff < 0
                      ? 'text-rose-500 bg-rose-500/10'
                      : 'text-muted-foreground bg-muted',
                )}
              >
                {growthRate.diff > 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
                ) : growthRate.diff < 0 ? (
                  <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" />
                ) : (
                  <Minus className="h-3.5 w-3.5 mr-0.5" />
                )}
                {growthRate.diff > 0 ? `+${growthRate.diff}` : growthRate.diff} {metricUnit} ({growthRate.percent > 0 ? `+${growthRate.percent}%` : `${growthRate.percent}%`})
              </span>
            </div>
          )}
        </div>

        {/* The SVG Line Chart */}
        {chartPoints.length < 2 ? (
          <div className="py-12 px-4 rounded-xl border border-dashed border-border text-center space-y-2">
            <Sparkles className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              {tHistory('notEnoughData')}
            </p>
          </div>
        ) : (
          <div className="relative select-none">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto overflow-visible"
            >
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary, #6366f1)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--color-primary, #6366f1)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Y Grid lines and tick labels */}
              {yTicks.map((tickVal, i) => {
                const y =
                  pad.top +
                  innerH -
                  ((tickVal - yTicks[0]) / (yTicks[yTicks.length - 1] - yTicks[0] || 1)) * innerH
                return (
                  <g key={i}>
                    <line
                      x1={pad.left}
                      y1={y}
                      x2={pad.left + innerW}
                      y2={y}
                      stroke="currentColor"
                      className="text-border/60"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={pad.left - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="text-[10px] fill-muted-foreground font-mono"
                    >
                      {tickVal}
                    </text>
                  </g>
                )
              })}

              {/* Area fill */}
              {areaD && <path d={areaD} fill="url(#areaGradient)" />}

              {/* Trend Polyline */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="var(--color-primary, #6366f1)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data points */}
              {plottedPoints.map((pt, i) => {
                const isSelected = hoveredPoint?.workoutId === pt.workoutId
                return (
                  <g
                    key={i}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onClick={() => setHoveredPoint(pt)}
                  >
                    {/* PR Glow indicator */}
                    {pt.isPR && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="9"
                        className="fill-amber-400/20 stroke-amber-400 animate-pulse"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* Point circle */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 6 : pt.isPR ? 5 : 4}
                      className={cn(
                        'transition-all duration-150',
                        pt.isPR
                          ? 'fill-amber-400 stroke-card'
                          : 'fill-primary stroke-card',
                      )}
                      strokeWidth="2"
                    />
                  </g>
                )
              })}

              {/* X Date labels (first, middle, last) */}
              {plottedPoints.length >= 2 && (
                <>
                  <text
                    x={plottedPoints[0].x}
                    y={pad.top + innerH + 18}
                    textAnchor="start"
                    className="text-[10px] fill-muted-foreground"
                  >
                    {plottedPoints[0].date.slice(5)}
                  </text>
                  {plottedPoints.length > 2 && (
                    <text
                      x={plottedPoints[Math.floor(plottedPoints.length / 2)].x}
                      y={pad.top + innerH + 18}
                      textAnchor="middle"
                      className="text-[10px] fill-muted-foreground"
                    >
                      {plottedPoints[Math.floor(plottedPoints.length / 2)].date.slice(5)}
                    </text>
                  )}
                  <text
                    x={plottedPoints[plottedPoints.length - 1].x}
                    y={pad.top + innerH + 18}
                    textAnchor="end"
                    className="text-[10px] fill-muted-foreground"
                  >
                    {plottedPoints[plottedPoints.length - 1].date.slice(5)}
                  </text>
                </>
              )}
            </svg>

            {/* Hover / Tap Tooltip Details Box */}
            {hoveredPoint && (
              <div className="mt-2 p-3 rounded-xl bg-card border border-primary/30 shadow-md text-xs space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground">
                      {hoveredPoint.formattedDate}
                    </span>
                    {hoveredPoint.isPR && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-500 text-[10px] font-bold">
                        <Award className="h-3 w-3" /> PR
                      </span>
                    )}
                  </div>
                  <span className="font-black text-primary text-sm font-mono">
                    {hoveredPoint.value} {metricUnit}
                  </span>
                </div>

                {/* Sets detail */}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {hoveredPoint.sets.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-mono text-muted-foreground"
                    >
                      #{s.set_number}: {s.weight_kg != null ? `${s.weight_kg}kg` : ''}
                      {s.reps != null ? ` × ${s.reps}` : ''}
                      {s.distance_km != null ? ` ${s.distance_km}km` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── 4. Muscle Group Training Distribution ──────────────────────────── */}
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

          <div className="space-y-2.5">
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
