'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Exercise } from '@/lib/exercises'
import { z } from 'zod'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WorkoutSet {
  id?: string
  exercise_id: string
  set_number: number
  weight_kg?: number | null
  reps?: number | null
  distance_km?: number | null
  duration_seconds?: number | null
  is_completed: boolean
  rpe?: number | null
}

export interface SaveWorkoutInput {
  date: string
  title?: string
  notes?: string
  sets: WorkoutSet[]
}

export type WorkoutHistoryExercise = Pick<
  Exercise,
  'id' | 'name_hu' | 'name_en' | 'name_zh' | 'category'
>

export interface WorkoutHistorySet extends WorkoutSet {
  id: string
  exercises: WorkoutHistoryExercise | WorkoutHistoryExercise[] | null
}

export interface WorkoutHistoryEntry {
  id: string
  date: string
  title: string | null
  notes: string | null
  created_at: string
  workout_sets: WorkoutHistorySet[]
}

// ─── Validation Schemas ──────────────────────────────────────────────────────

const WorkoutSetSchema = z.object({
  exercise_id: z.string().uuid(),
  set_number: z.number().int().positive(),
  weight_kg: z.number().nonnegative().optional().nullable(),
  reps: z.number().int().nonnegative().optional().nullable(),
  distance_km: z.number().nonnegative().optional().nullable(),
  duration_seconds: z.number().int().nonnegative().optional().nullable(),
  is_completed: z.boolean(),
  rpe: z.number().min(1).max(10).nullable().optional(),
})

const SaveWorkoutSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  sets: z.array(WorkoutSetSchema).min(1),
})

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Saves a complete workout session with all its sets.
 * Returns the new workout ID on success.
 */
export async function saveWorkout(input: SaveWorkoutInput): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  const parsed = SaveWorkoutSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const { date, title, notes, sets } = parsed.data

  // Insert the workout header
  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .insert({ user_id: user.id, date, title: title ?? null, notes: notes ?? null })
    .select('id')
    .single()

  if (workoutError || !workout) {
    return { error: workoutError?.message ?? 'Failed to create workout' }
  }

  // Insert all sets
  const setsToInsert = sets.map((s) => ({
    workout_id: workout.id,
    exercise_id: s.exercise_id,
    set_number: s.set_number,
    weight_kg: s.weight_kg ?? 0,
    reps: s.reps ?? 0,
    distance_km: s.distance_km ?? null,
    duration_seconds: s.duration_seconds ?? null,
    is_completed: s.is_completed,
    rpe: s.rpe ?? null,
  }))

  const { error: setsError } = await supabase.from('workout_sets').insert(setsToInsert)

  if (setsError) {
    // Rollback workout header
    await supabase.from('workouts').delete().eq('id', workout.id)
    if (
      setsError.message.includes('distance_km') ||
      setsError.message.includes('duration_seconds') ||
      setsError.message.includes('workout_sets_reps_check') ||
      setsError.message.includes('schema cache')
    ) {
      return {
        error:
          '資料庫尚未更新有氧運動欄位，請先至 Supabase SQL Editor 執行 migration_cardio.sql。',
      }
    }
    return { error: setsError.message }
  }

  revalidatePath('/[locale]/history', 'page')
  revalidatePath('/[locale]', 'page')

  return { id: workout.id }
}

/**
 * Fetches the last recorded set data for a specific exercise by the current user.
 * Used for "Last session" auto-fill UX.
 */
export async function getLastSetForExercise(
  exerciseId: string,
): Promise<{
  weight_kg?: number | null
  reps?: number | null
  distance_km?: number | null
  duration_seconds?: number | null
} | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('workout_sets')
    .select('weight_kg, reps, distance_km, duration_seconds, workouts!inner(user_id, date)')
    .eq('exercise_id', exerciseId)
    .eq('workouts.user_id', user.id)
    .eq('is_completed', true)
    .order('workouts(date)', { ascending: false })
    .order('set_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    // Fallback if migration not executed yet
    const { data: fallbackData } = await supabase
      .from('workout_sets')
      .select('weight_kg, reps, workouts!inner(user_id, date)')
      .eq('exercise_id', exerciseId)
      .eq('workouts.user_id', user.id)
      .eq('is_completed', true)
      .order('workouts(date)', { ascending: false })
      .order('set_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!fallbackData) return null
    return {
      weight_kg: fallbackData.weight_kg,
      reps: fallbackData.reps,
      distance_km: null,
      duration_seconds: null,
    }
  }

  if (!data) return null

  return {
    weight_kg: data.weight_kg,
    reps: data.reps,
    distance_km: data.distance_km ?? null,
    duration_seconds: data.duration_seconds ?? null,
  }
}

/**
 * Fetches all workouts for the current user, ordered by date descending.
 */
export async function getWorkoutHistory(): Promise<WorkoutHistoryEntry[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('workouts')
    .select(`
      id,
      date,
      title,
      notes,
      created_at,
      workout_sets(
        id,
        exercise_id,
        set_number,
        weight_kg,
        reps,
        distance_km,
        duration_seconds,
        is_completed,
        rpe,
        exercises(id, name_hu, name_en, name_zh, category)
      )
    `)
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    const { data: fallbackData } = await supabase
      .from('workouts')
      .select(`
        id,
        date,
        title,
        notes,
        created_at,
        workout_sets(
          id,
          exercise_id,
          set_number,
          weight_kg,
          reps,
          is_completed,
          rpe,
          exercises(id, name_hu, name_en, name_zh, category)
        )
      `)
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    return (fallbackData as unknown as WorkoutHistoryEntry[]) ?? []
  }

  return (data as unknown as WorkoutHistoryEntry[]) ?? []
}

/**
 * Deletes a workout and all its sets (cascade handled by DB FK).
 */
export async function deleteWorkout(workoutId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', workoutId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/[locale]/history', 'page')
  return {}
}
