'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/exercises'
import type { WorkoutHistoryEntry } from '@/lib/actions/workout'

interface WorkoutCalendarProps {
  workouts: WorkoutHistoryEntry[]
  selectedDate: string
  onSelectDate: (date: string) => void
  locale: Locale
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`
}

function getTodayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export default function WorkoutCalendar({
  workouts,
  selectedDate,
  onSelectDate,
  locale,
}: WorkoutCalendarProps) {
  const tHistory = useTranslations('history')
  const todayStr = useMemo(() => getTodayString(), [])

  // Initialize view year & month from selectedDate or today
  const [viewDate, setViewDate] = useState(() => {
    const initial = selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date()
    return {
      year: initial.getFullYear(),
      month: initial.getMonth(), // 0 - 11
    }
  })

  // Index workouts by date string
  const workoutsByDate = useMemo(() => {
    const map = new Map<string, WorkoutHistoryEntry[]>()
    for (const w of workouts) {
      const list = map.get(w.date) || []
      list.push(w)
      map.set(w.date, list)
    }
    return map
  }, [workouts])

  // Monthly statistics
  const monthlyStats = useMemo(() => {
    let daysWithWorkout = 0
    let totalSets = 0
    let totalWorkouts = 0

    const prefix = `${viewDate.year}-${pad2(viewDate.month + 1)}-`
    for (const [date, list] of workoutsByDate.entries()) {
      if (date.startsWith(prefix)) {
        daysWithWorkout++
        totalWorkouts += list.length
        for (const w of list) {
          totalSets += w.workout_sets?.length ?? 0
        }
      }
    }

    return { daysWithWorkout, totalSets, totalWorkouts }
  }, [viewDate, workoutsByDate])

  // Weekday names
  const weekdays = useMemo(() => {
    const list: string[] = []
    // 2026-10-04 is a Sunday
    for (let i = 0; i < 7; i++) {
      const d = new Date(2026, 9, 4 + i)
      const name = d.toLocaleDateString(locale === 'zh-TW' ? 'zh-TW' : locale, {
        weekday: locale === 'zh-TW' ? 'narrow' : 'short',
      })
      list.push(name)
    }
    return list
  }, [locale])

  // Month & Year header label
  const monthHeaderLabel = useMemo(() => {
    const d = new Date(viewDate.year, viewDate.month, 1)
    return d.toLocaleDateString(locale === 'zh-TW' ? 'zh-TW' : locale, {
      year: 'numeric',
      month: 'long',
    })
  }, [viewDate, locale])

  // Navigation
  const prevMonth = () => {
    setViewDate((prev) => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 }
      }
      return { year: prev.year, month: prev.month - 1 }
    })
  }

  const nextMonth = () => {
    setViewDate((prev) => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 }
      }
      return { year: prev.year, month: prev.month + 1 }
    })
  }

  const goToToday = () => {
    const now = new Date()
    setViewDate({ year: now.getFullYear(), month: now.getMonth() })
    onSelectDate(todayStr)
  }

  // Generate calendar grid (Sunday to Saturday)
  const calendarCells = useMemo(() => {
    const { year, month } = viewDate
    const firstDayIndex = new Date(year, month, 1).getDay() // 0 = Sunday
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    const cells: Array<{
      dateStr: string
      dayNum: number
      isCurrentMonth: boolean
      hasWorkout: boolean
      workoutCount: number
      setCount: number
      hasCardio: boolean
      hasStrength: boolean
    }> = []

    // 1. Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i
      const prevMonthIdx = month === 0 ? 11 : month - 1
      const prevYear = month === 0 ? year - 1 : year
      const dateStr = toDateString(prevYear, prevMonthIdx, dayNum)
      const dayWorkouts = workoutsByDate.get(dateStr) || []
      const setCount = dayWorkouts.reduce(
        (sum, w) => sum + (w.workout_sets?.length ?? 0),
        0,
      )

      let hasCardio = false
      let hasStrength = false
      for (const w of dayWorkouts) {
        for (const s of w.workout_sets ?? []) {
          const ex = Array.isArray(s.exercises) ? s.exercises[0] : s.exercises
          if (ex?.category === 'cardio') hasCardio = true
          else hasStrength = true
        }
      }

      cells.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        hasWorkout: dayWorkouts.length > 0,
        workoutCount: dayWorkouts.length,
        setCount,
        hasCardio,
        hasStrength,
      })
    }

    // 2. Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = toDateString(year, month, d)
      const dayWorkouts = workoutsByDate.get(dateStr) || []
      const setCount = dayWorkouts.reduce(
        (sum, w) => sum + (w.workout_sets?.length ?? 0),
        0,
      )

      let hasCardio = false
      let hasStrength = false
      for (const w of dayWorkouts) {
        for (const s of w.workout_sets ?? []) {
          const ex = Array.isArray(s.exercises) ? s.exercises[0] : s.exercises
          if (ex?.category === 'cardio') hasCardio = true
          else hasStrength = true
        }
      }

      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        hasWorkout: dayWorkouts.length > 0,
        workoutCount: dayWorkouts.length,
        setCount,
        hasCardio,
        hasStrength,
      })
    }

    // 3. Next month leading days (fill up to full weeks: 35 or 42)
    const totalCurrentCells = cells.length
    const targetTotal = totalCurrentCells <= 35 ? 35 : 42
    const remaining = targetTotal - totalCurrentCells
    const nextMonthIdx = month === 11 ? 0 : month + 1
    const nextYear = month === 11 ? year + 1 : year

    for (let d = 1; d <= remaining; d++) {
      const dateStr = toDateString(nextYear, nextMonthIdx, d)
      const dayWorkouts = workoutsByDate.get(dateStr) || []
      const setCount = dayWorkouts.reduce(
        (sum, w) => sum + (w.workout_sets?.length ?? 0),
        0,
      )

      let hasCardio = false
      let hasStrength = false
      for (const w of dayWorkouts) {
        for (const s of w.workout_sets ?? []) {
          const ex = Array.isArray(s.exercises) ? s.exercises[0] : s.exercises
          if (ex?.category === 'cardio') hasCardio = true
          else hasStrength = true
        }
      }

      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        hasWorkout: dayWorkouts.length > 0,
        workoutCount: dayWorkouts.length,
        setCount,
        hasCardio,
        hasStrength,
      })
    }

    return cells
  }, [viewDate, workoutsByDate])

  const handleCellClick = (cell: (typeof calendarCells)[number]) => {
    onSelectDate(cell.dateStr)
    if (!cell.isCurrentMonth) {
      // Sync view month if clicking padding date
      const cellDate = new Date(`${cell.dateStr}T00:00:00`)
      setViewDate({
        year: cellDate.getFullYear(),
        month: cellDate.getMonth(),
      })
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3.5">
      {/* Month Navigation & Today Jump */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-base font-bold text-foreground tracking-tight px-1">
            {monthHeaderLabel}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={goToToday}
          className="text-xs font-medium px-2.5 py-1 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted text-foreground transition-colors"
        >
          {tHistory('today')}
        </button>
      </div>

      {/* Monthly Stats Banner */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-primary/5 border border-primary/15 text-xs">
        <div className="flex items-center gap-1.5 text-primary font-medium">
          <Sparkles className="h-3.5 w-3.5" />
          <span>
            {tHistory('monthSummary', {
              days: monthlyStats.daysWithWorkout,
              sets: monthlyStats.totalSets,
            })}
          </span>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdays.map((day, idx) => (
          <div
            key={idx}
            className="text-[11px] font-semibold text-muted-foreground py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {calendarCells.map((cell) => {
          const isSelected = cell.dateStr === selectedDate
          const isToday = cell.dateStr === todayStr

          return (
            <button
              key={cell.dateStr}
              type="button"
              onClick={() => handleCellClick(cell)}
              className={cn(
                'relative flex flex-col items-center justify-center h-11 w-full rounded-xl transition-all duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                // Non-current month styling
                !cell.isCurrentMonth && 'opacity-35',
                // Default styling
                !isSelected && 'hover:bg-muted/60 text-foreground',
                // Today border when not selected
                isToday && !isSelected && 'border-2 border-primary/60 font-bold',
                // Selected styling
                isSelected &&
                  'bg-primary text-primary-foreground font-bold shadow-md scale-[1.03]',
              )}
            >
              {/* Day number */}
              <span className="text-xs leading-none">{cell.dayNum}</span>

              {/* Workout indicator dot(s) */}
              <div className="h-2 flex items-center justify-center gap-0.5 mt-1">
                {cell.hasWorkout && (
                  <>
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full transition-colors',
                        isSelected
                          ? 'bg-primary-foreground'
                          : cell.hasCardio && !cell.hasStrength
                            ? 'bg-sky-500 shadow-[0_0_4px_rgba(14,165,233,0.6)]'
                            : 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]',
                      )}
                    />
                    {/* Secondary dot if multiple workouts or mixed cardio+strength */}
                    {(cell.workoutCount > 1 || (cell.hasCardio && cell.hasStrength)) && (
                      <span
                        className={cn(
                          'h-1 w-1 rounded-full',
                          isSelected
                            ? 'bg-primary-foreground/80'
                            : cell.hasCardio
                              ? 'bg-sky-400'
                              : 'bg-emerald-400',
                        )}
                      />
                    )}
                  </>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
