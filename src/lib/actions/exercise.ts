'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { Exercise } from '@/lib/exercises'

// ─── Validation Schemas ──────────────────────────────────────────────────────

const ExerciseSchema = z.object({
  name_hu: z.string().max(200).nullable().optional(),
  name_en: z.string().max(200).nullable().optional(),
  name_zh: z.string().max(200).nullable().optional(),
  category: z.enum(['legs', 'chest', 'back', 'shoulders', 'arms', 'core', 'cardio', 'other']),
}).refine(
  (data) => data.name_hu || data.name_en || data.name_zh,
  { message: 'At least one name (hu, en, or zh) must be provided.' },
)

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Fetches all exercises accessible to the current user.
 * Includes global exercises (user_id IS NULL) and user's own exercises.
 */
export async function getExercises(): Promise<Exercise[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('exercises')
    .select('id, name_hu, name_en, name_zh, category, user_id')
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order('category')
    .order('name_hu')

  return (data as Exercise[]) ?? []
}

/**
 * Creates a new exercise for the current user.
 */
export async function createExercise(
  input: Partial<Pick<Exercise, 'name_hu' | 'name_en' | 'name_zh' | 'category'>>,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = ExerciseSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const { data, error } = await supabase
    .from('exercises')
    .insert({ ...parsed.data, user_id: user.id })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Failed to create exercise' }

  revalidatePath('/[locale]/exercises', 'page')
  return { id: data.id }
}

/**
 * Updates an existing exercise owned by the current user.
 */
export async function updateExercise(
  id: string,
  input: Partial<Pick<Exercise, 'name_hu' | 'name_en' | 'name_zh' | 'category'>>,
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = ExerciseSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const { error } = await supabase
    .from('exercises')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/[locale]/exercises', 'page')
  return {}
}

/**
 * Deletes an exercise owned by the current user.
 */
export async function deleteExercise(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('exercises')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/[locale]/exercises', 'page')
  return {}
}
