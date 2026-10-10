'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Timer, X, RotateCcw, Play, Pause } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RestTimerProps {
  /** Called when the user dismisses the timer */
  onClose: () => void
  /** Initial duration in seconds (default: 60) */
  initialSeconds?: number
}

const PRESETS = [60, 90, 120] as const

export default function RestTimer({ onClose, initialSeconds = 60 }: RestTimerProps) {
  const t = useTranslations('restTimer')
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds)
  const [remaining, setRemaining] = useState(initialSeconds)
  const [isRunning, setIsRunning] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const progress = totalSeconds > 0 ? (remaining / totalSeconds) * 100 : 0
  const isFinished = remaining <= 0

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!isRunning || isFinished) {
      clearTimer()
      return
    }

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearTimer()
          setIsRunning(false)
          // Vibrate on mobile if supported
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([200, 100, 200])
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return clearTimer
  }, [isRunning, isFinished, clearTimer])

  function handlePreset(secs: number) {
    clearTimer()
    setTotalSeconds(secs)
    setRemaining(secs)
    setIsRunning(true)
  }

  function handleReset() {
    clearTimer()
    setRemaining(totalSeconds)
    setIsRunning(true)
  }

  function handleTogglePause() {
    setIsRunning((prev) => !prev)
  }

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  // SVG circle progress
  const RADIUS = 40
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress / 100)

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-72 max-w-[calc(100vw-2rem)]
                 bg-card border border-border rounded-2xl shadow-2xl p-4"
      role="timer"
      aria-label={t('title')}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Timer className="h-4 w-4 text-primary" />
          {t('title')}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-muted transition-colors"
          aria-label={t('skip')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Circular Progress */}
      <div className="flex items-center justify-center mb-3">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background ring */}
            <circle
              cx="50" cy="50" r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted"
            />
            {/* Progress ring */}
            <circle
              cx="50" cy="50" r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              className={cn(
                'transition-all duration-1000',
                isFinished ? 'text-destructive' : 'text-primary',
              )}
            />
          </svg>
          {/* Time text */}
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className={cn(
              'text-2xl font-mono font-bold tabular-nums',
              isFinished && 'text-destructive animate-pulse',
            )}>
              {timeDisplay}
            </span>
            {isFinished && (
              <span className="text-[10px] text-destructive font-medium">{t('finished')}</span>
            )}
          </div>
        </div>
      </div>

      {/* Preset buttons */}
      <div className="flex justify-center gap-2 mb-3">
        {PRESETS.map((secs) => (
          <button
            key={secs}
            onClick={() => handlePreset(secs)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              totalSeconds === secs && !isFinished
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-muted-foreground border-border hover:bg-accent',
            )}
          >
            {secs}{t('seconds')}
          </button>
        ))}
      </div>

      {/* Control buttons */}
      <div className="flex justify-center gap-3">
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm
                     bg-muted hover:bg-accent text-foreground transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t('reset')}
        </button>
        <button
          onClick={handleTogglePause}
          disabled={isFinished}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
            isFinished
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          {isRunning ? (
            <><Pause className="h-3.5 w-3.5" />{t('pause')}</>
          ) : (
            <><Play className="h-3.5 w-3.5" />{t('start')}</>
          )}
        </button>
      </div>
    </div>
  )
}
