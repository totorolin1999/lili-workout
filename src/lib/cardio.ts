/**
 * Utilities for cardio exercises (Running, Cycling, etc.)
 */

/**
 * Formats total seconds into a human-readable mm:ss or hh:mm:ss string.
 * e.g. 1530 -> "25:30", 3665 -> "1:01:05"
 */
export function formatSecondsToTime(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || isNaN(totalSeconds) || totalSeconds <= 0) return ''
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/**
 * Parses user input string (e.g. "25:30", "1:15:00", "30", "20.5") into total seconds.
 */
export function parseTimeToSeconds(input: string | number | null | undefined): number | null {
  if (input == null) return null
  if (typeof input === 'number') {
    return isNaN(input) || input <= 0 ? null : Math.round(input)
  }

  const trimmed = input.trim()
  if (!trimmed) return null

  const parts = trimmed.split(':').map((p) => p.trim())
  if (parts.length === 3) {
    const h = Number(parts[0])
    const m = Number(parts[1])
    const s = Number(parts[2])
    if (!isNaN(h) && !isNaN(m) && !isNaN(s)) {
      return Math.max(0, Math.round(h * 3600 + m * 60 + s))
    }
  } else if (parts.length === 2) {
    const m = Number(parts[0])
    const s = Number(parts[1])
    if (!isNaN(m) && !isNaN(s)) {
      return Math.max(0, Math.round(m * 60 + s))
    }
  } else if (parts.length === 1) {
    const num = Number(parts[0])
    if (!isNaN(num) && num > 0) {
      // If entered as a plain number e.g. 30 -> treat as 30 minutes (1800s)
      return Math.round(num * 60)
    }
  }
  return null
}

/**
 * Calculates pace string in min'sec"/km from distance (km) and duration (seconds).
 * e.g. 5 km in 1500s (25m) -> "5'00\"/km"
 */
export function calculatePace(
  distanceKm: number | null | undefined,
  durationSeconds: number | null | undefined,
): string | null {
  if (!distanceKm || !durationSeconds || distanceKm <= 0 || durationSeconds <= 0) {
    return null
  }
  const secPerKm = durationSeconds / distanceKm
  const paceMinutes = Math.floor(secPerKm / 60)
  const paceSeconds = Math.round(secPerKm % 60)

  // Don't show unrealistic paces (> 60 min/km)
  if (paceMinutes >= 60) return null

  if (paceSeconds === 60) {
    return `${paceMinutes + 1}'00"/km`
  }

  return `${paceMinutes}'${String(paceSeconds).padStart(2, '0')}"/km`
}
