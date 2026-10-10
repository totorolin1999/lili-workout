'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WorkoutSet {
  id?: string
  exercise_id: string
  set_number: number
  weight_kg: number
  reps: number
  is_completed: boolean
  rpe?: number | null
}

export interface SaveWorkoutInput {
  date: string
  title?: string
  notes?: string
  sets: WorkoutSet[]
}

// ─── Validation Schemas ──────────────────────────────────────────────────────

const WorkoutSetSchema = z.object({
  exercise_id: z.string().uuid(),
  set_number: z.number().int().positive(),
  weight_kg: z.number().nonnegative(),
  reps: z.number().int().positive(),
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
    weight_kg: s.weight_kg,
    reps: s.reps,
    is_completed: s.is_completed,
    rpe: s.rpe ?? null,
  }))

  const { error: setsError } = await supabase.from('workout_sets').insert(setsToInsert)

  if (setsError) {
    // Rollback workout header
    await supabase.from('workouts').delete().eq('id', workout.id)
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
): Promise<{ weight_kg: number; reps: number } | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('workout_sets')
    .select('weight_kg, reps, workouts!inner(user_id, date)')
    .eq('exercise_id', exerciseId)
    .eq('workouts.user_id', user.id)
    .eq('is_completed', true)
    .order('workouts(date)', { ascending: false })
    .order('set_number', { ascending: false })
    .limit(1)
    .single()

  if (!data) return null

  return { weight_kg: data.weight_kg, reps: data.reps }
}

/**
 * Fetches all workouts for the current user, ordered by date descending.
 */
export async function getWorkoutHistory() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
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

  return data ?? []
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
