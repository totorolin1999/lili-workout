'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { CALCULATION_TYPES, type CalculationType, type Exercise } from '@/lib/exercises'

// ─── Validation Schemas ──────────────────────────────────────────────────────

const ExerciseSchema = z.object({
  name_hu: z.string().max(200).nullable().optional(),
  name_en: z.string().max(200).nullable().optional(),
  name_zh: z.string().max(200).nullable().optional(),
  category: z.enum(['legs', 'chest', 'back', 'shoulders', 'arms', 'core', 'cardio', 'other']),
  calculation_type: z.enum(CALCULATION_TYPES as unknown as [CalculationType, ...CalculationType[]]).optional().nullable(),
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

  // Attempt query with calculation_type; if column does not exist in DB yet, fallback gracefully
  const queryWithCalc = await supabase
    .from('exercises')
    .select('id, name_hu, name_en, name_zh, category, calculation_type, user_id')
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order('category')
    .order('name_hu')

  if (!queryWithCalc.error) {
    return (queryWithCalc.data as Exercise[]) ?? []
  }

  // Fallback for when calculation_type column has not been added to DB yet
  const fallbackQuery = await supabase
    .from('exercises')
    .select('id, name_hu, name_en, name_zh, category, user_id')
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order('category')
    .order('name_hu')

  return (fallbackQuery.data as Exercise[]) ?? []
}

/**
 * Creates a new exercise for the current user.
 */
export async function createExercise(
  input: Partial<Pick<Exercise, 'name_hu' | 'name_en' | 'name_zh' | 'category' | 'calculation_type'>>,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = ExerciseSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  // Attempt insert with calculation_type
  let res = await supabase
    .from('exercises')
    .insert({ ...parsed.data, user_id: user.id })
    .select('id')
    .single()

  // If column doesn't exist in DB, retry without calculation_type
  if (res.error && res.error.code === '42703') {
    const { calculation_type, ...withoutCalc } = parsed.data
    res = await supabase
      .from('exercises')
      .insert({ ...withoutCalc, user_id: user.id })
      .select('id')
      .single()
  }

  if (res.error || !res.data) return { error: res.error?.message ?? 'Failed to create exercise' }

  revalidatePath('/[locale]/exercises', 'page')
  return { id: res.data.id }
}

/**
 * Updates an existing exercise owned by the current user.
 */
export async function updateExercise(
  id: string,
  input: Partial<Pick<Exercise, 'name_hu' | 'name_en' | 'name_zh' | 'category' | 'calculation_type'>>,
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = ExerciseSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  let res = await supabase
    .from('exercises')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', user.id)

  if (res.error && res.error.code === '42703') {
    const { calculation_type, ...withoutCalc } = parsed.data
    res = await supabase
      .from('exercises')
      .update(withoutCalc)
      .eq('id', id)
      .eq('user_id', user.id)
  }

  if (res.error) return { error: res.error.message }

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
