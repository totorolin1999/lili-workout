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
  category: z.enum(['legs', 'glutes', 'chest', 'back', 'shoulders', 'arms', 'core', 'cardio', 'other']),
  calculation_type: z.enum(CALCULATION_TYPES as unknown as [CalculationType, ...CalculationType[]]).optional().nullable(),
  tags: z.array(z.string()).optional(),
}).refine(
  (data) => data.name_hu || data.name_en || data.name_zh,
  { message: 'At least one name (hu, en, or zh) must be provided.' },
)

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Fetches all exercises accessible to the current user.
 * Includes global exercises (user_id IS NULL) and user's own exercises,
 * plus associated tags.
 */
export async function getExercises(): Promise<Exercise[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let exercises: Exercise[] = []

  // Attempt query with calculation_type; if column does not exist in DB yet, fallback gracefully
  const queryWithCalc = await supabase
    .from('exercises')
    .select('id, name_hu, name_en, name_zh, category, calculation_type, user_id')
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order('category')
    .order('name_hu')

  if (!queryWithCalc.error && queryWithCalc.data) {
    exercises = queryWithCalc.data as Exercise[]
  } else {
    // Fallback for when calculation_type column has not been added to DB yet
    const fallbackQuery = await supabase
      .from('exercises')
      .select('id, name_hu, name_en, name_zh, category, user_id')
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .order('category')
      .order('name_hu')

    exercises = (fallbackQuery.data as Exercise[]) ?? []
  }

  // Fetch tags if exercise_tags table exists
  try {
    const { data: tagsData, error: tagsError } = await supabase
      .from('exercise_tags')
      .select('exercise_id, tag')
      .or(`user_id.is.null,user_id.eq.${user.id}`)

    if (!tagsError && tagsData) {
      const tagsMap = new Map<string, string[]>()
      for (const item of tagsData) {
        if (!tagsMap.has(item.exercise_id)) {
          tagsMap.set(item.exercise_id, [])
        }
        tagsMap.get(item.exercise_id)!.push(item.tag)
      }

      for (const ex of exercises) {
        if (tagsMap.has(ex.id)) {
          ex.tags = tagsMap.get(ex.id)
        }
      }
    }
  } catch {
    // Graceful ignore if table doesn't exist
  }

  return exercises
}

/**
 * Creates a new exercise for the current user.
 */
export async function createExercise(
  input: Partial<Pick<Exercise, 'name_hu' | 'name_en' | 'name_zh' | 'category' | 'calculation_type' | 'tags'>>,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = ExerciseSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const { tags, ...exerciseFields } = parsed.data

  // Attempt insert with calculation_type
  let res = await supabase
    .from('exercises')
    .insert({ ...exerciseFields, user_id: user.id })
    .select('id')
    .single()

  // If column doesn't exist in DB, retry without calculation_type
  if (res.error && res.error.code === '42703') {
    const { calculation_type, ...withoutCalc } = exerciseFields
    res = await supabase
      .from('exercises')
      .insert({ ...withoutCalc, user_id: user.id })
      .select('id')
      .single()
  }

  if (res.error || !res.data) return { error: res.error?.message ?? 'Failed to create exercise' }

  const exerciseId = res.data.id

  // If tags provided, save to exercise_tags
  if (tags && tags.length > 0) {
    try {
      const tagsToInsert = tags
        .map((t) => t.trim())
        .filter(Boolean)
        .map((tag) => ({
          exercise_id: exerciseId,
          user_id: user.id,
          tag,
        }))
      if (tagsToInsert.length > 0) {
        await supabase.from('exercise_tags').insert(tagsToInsert)
      }
    } catch {
      // Graceful ignore if table not present
    }
  }

  revalidatePath('/[locale]/exercises', 'page')
  return { id: exerciseId }
}

/**
 * Updates an existing exercise owned by the current user.
 */
export async function updateExercise(
  id: string,
  input: Partial<Pick<Exercise, 'name_hu' | 'name_en' | 'name_zh' | 'category' | 'calculation_type' | 'tags'>>,
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = ExerciseSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const { tags, ...exerciseFields } = parsed.data

  let res = await supabase
    .from('exercises')
    .update(exerciseFields)
    .eq('id', id)
    .eq('user_id', user.id)

  if (res.error && res.error.code === '42703') {
    const { calculation_type, ...withoutCalc } = exerciseFields
    res = await supabase
      .from('exercises')
      .update(withoutCalc)
      .eq('id', id)
      .eq('user_id', user.id)
  }

  if (res.error) return { error: res.error.message }

  // Sync tags if provided
  if (tags !== undefined) {
    try {
      await supabase
        .from('exercise_tags')
        .delete()
        .eq('exercise_id', id)
        .eq('user_id', user.id)

      const tagsToInsert = tags
        .map((t) => t.trim())
        .filter(Boolean)
        .map((tag) => ({
          exercise_id: id,
          user_id: user.id,
          tag,
        }))
      if (tagsToInsert.length > 0) {
        await supabase.from('exercise_tags').insert(tagsToInsert)
      }
    } catch {
      // Graceful ignore
    }
  }

  revalidatePath('/[locale]/exercises', 'page')
  return {}
}

/**
 * Adds a single tag to an exercise for the current user.
 * Supports both built-in global exercises and user-created exercises.
 */
export async function addExerciseTag(
  exerciseId: string,
  tag: string,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const cleanTag = tag.trim()
  if (!cleanTag) return { error: 'Tag cannot be empty' }

  const { error } = await supabase
    .from('exercise_tags')
    .insert({
      exercise_id: exerciseId,
      user_id: user.id,
      tag: cleanTag,
    })

  if (error) {
    if (error.code === '23505') {
      // Already exists, treat as success
      return { success: true }
    }
    if (error.code === '42P01') {
      return {
        error: '資料庫尚未新增 exercise_tags 表，請先至 Supabase SQL Editor 執行 migration。',
      }
    }
    return { error: error.message }
  }

  revalidatePath('/[locale]/exercises', 'page')
  revalidatePath('/[locale]', 'page')
  return { success: true }
}

/**
 * Removes a custom tag from an exercise for the current user.
 */
export async function removeExerciseTag(
  exerciseId: string,
  tag: string,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const cleanTag = tag.trim()
  const { error } = await supabase
    .from('exercise_tags')
    .delete()
    .eq('exercise_id', exerciseId)
    .eq('user_id', user.id)
    .eq('tag', cleanTag)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/[locale]/exercises', 'page')
  revalidatePath('/[locale]', 'page')
  return { success: true }
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
