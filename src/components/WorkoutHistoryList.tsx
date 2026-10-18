'use client'

import { useState, useTransition, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  Calendar as CalendarIcon,
  List as ListIcon,
  TrendingUp,
  Dumbbell,
  Plus,
  Coffee,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Exercise, Locale } from '@/lib/exercises'
import {
  deleteWorkout,
  type WorkoutHistoryEntry,
} from '@/lib/actions/workout'
import WorkoutCalendar from './WorkoutCalendar'
import WorkoutCard, { formatDate } from './WorkoutCard'
import WorkoutAnalytics from './WorkoutAnalytics'

interface WorkoutHistoryListProps {
  initialWorkouts: WorkoutHistoryEntry[]
  exercises?: Exercise[]
  locale: Locale
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function getTodayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export default function WorkoutHistoryList({
  initialWorkouts,
  exercises = [],
  locale,
}: WorkoutHistoryListProps) {
  const tHistory = useTranslations('history')
  const [workouts, setWorkouts] = useState(initialWorkouts)
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'chart'>('calendar')
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default to most recent workout date if exists, or today
    if (initialWorkouts.length > 0) {
      return initialWorkouts[0].date
    }
    return getTodayString()
  })

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const combinedExercises = useMemo(() => {
    const list = [...(exercises ?? [])]
    for (const w of workouts) {
      for (const s of w.workout_sets ?? []) {
        const related = s.exercises
        const ex = Array.isArray(related) ? related[0] : related
        if (ex && !list.some((item) => item.id === ex.id)) {
          list.push({
            ...ex,
            user_id: null,
          } as Exercise)
        }
      }
    }
    return list
  }, [exercises, workouts])

  function toggleExpand(id: string) {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(tHistory('confirmDelete'))) return

    setDeletingId(id)
    startTransition(async () => {
      const result = await deleteWorkout(id)
      setDeletingId(null)
      if (result.error) {
        alert(result.error)
        return
      }
      setWorkouts((prev) => prev.filter((w) => w.id !== id))
    })
  }

  function handleUpdate(updated: WorkoutHistoryEntry) {
    setWorkouts((prev) =>
      prev.map((w) => (w.id === updated.id ? updated : w)),
    )
  }

  // Workouts on currently selected date in calendar view
  const selectedDateWorkouts = useMemo(() => {
    return workouts.filter((w) => w.date === selectedDate)
  }, [workouts, selectedDate])

  const selectedDateSetsCount = useMemo(() => {
    return selectedDateWorkouts.reduce(
      (sum, w) => sum + (w.workout_sets?.length ?? 0),
      0,
    )
  }, [selectedDateWorkouts])

  if (workouts.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-foreground">{tHistory('title')}</h1>
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Dumbbell className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{tHistory('noHistory')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Top Bar: Title & View Mode Switcher */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">{tHistory('title')}</h1>

        {/* View Switcher Segmented Control */}
        <div className="inline-flex items-center p-1 rounded-xl bg-muted border border-border">
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all',
              viewMode === 'calendar'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            <span>{tHistory('calendarView')}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all',
              viewMode === 'list'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <ListIcon className="h-3.5 w-3.5" />
            <span>{tHistory('listView')}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('chart')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all',
              viewMode === 'chart'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{tHistory('chartView')}</span>
          </button>
        </div>
      </div>

      {/* 1. Calendar View */}
      {viewMode === 'calendar' && (
        <div className="space-y-4">
          {/* Calendar Component */}
          <WorkoutCalendar
            workouts={workouts}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            locale={locale}
          />

          {/* Selected Date Header */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  {formatDate(selectedDate, locale)}
                </span>
                {selectedDateWorkouts.length > 0 && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
                    {selectedDateSetsCount} {tHistory('sets')}
                  </span>
                )}
              </div>
            </div>

            {/* Selected Date Details */}
            {selectedDateWorkouts.length > 0 ? (
              <div className="space-y-3">
                {selectedDateWorkouts.map((workout, index) => (
                  <WorkoutCard
                    key={workout.id}
                    workout={workout}
                    locale={locale}
                    combinedExercises={combinedExercises}
                    isExpanded={!!expandedIds[workout.id]}
                    onToggleExpand={() => toggleExpand(workout.id)}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    isDeleting={deletingId === workout.id}
                    hideDateHeader={true}
                    indexInDay={index}
                  />
                ))}
              </div>
            ) : (
              /* Rest Day Empty State */
              <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center space-y-3">
                <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Coffee className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold text-foreground">
                    {tHistory('restDay')}
                  </h2>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    {tHistory('restDayDesc')}
                  </p>
                </div>
                <div className="pt-1">
                  <Link
                    href={`/${locale}?date=${selectedDate}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{tHistory('logWorkoutForDay')}</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {workouts.map((workout) => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              locale={locale}
              combinedExercises={combinedExercises}
              isExpanded={!!expandedIds[workout.id]}
              onToggleExpand={() => toggleExpand(workout.id)}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              isDeleting={deletingId === workout.id}
              hideDateHeader={false}
            />
          ))}
        </div>
      )}

      {/* 3. Analytics Chart View */}
      {viewMode === 'chart' && (
        <WorkoutAnalytics
          workouts={workouts}
          locale={locale}
        />
      )}
    </div>
  )
}
