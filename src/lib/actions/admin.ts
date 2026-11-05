'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export type MemberRole = 'admin' | 'member'

export interface MemberSummary {
  id: string
  email: string
  display_name: string
  role: MemberRole
  created_at: string
  workouts_count: number
  sets_count: number
  last_workout_date: string | null
  active_days_30d: number
}

export interface MemberWorkoutDetail {
  id: string
  date: string
  title: string | null
  notes: string | null
  created_at: string
  sets_count: number
  exercises: {
    name_zh: string | null
    name_en: string | null
    name_hu: string | null
    category: string
    set_count: number
  }[]
}

export interface MemberExercise {
  id: string
  name_hu: string | null
  name_en: string | null
  name_zh: string | null
  category: string
  calculation_type: string
  created_at: string
}

export interface MemberFullDetails {
  member: MemberSummary
  workouts: MemberWorkoutDetail[]
  customExercises: MemberExercise[]
  muscleDistribution: { category: string; count: number }[]
}

/**
 * Returns a privileged Supabase client if SUPABASE_SERVICE_ROLE_KEY is configured,
 * otherwise returns null.
 */
function getServiceRoleClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) return null
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}

/**
 * Verifies if the currently logged in user is an administrator.
 */
export async function checkIsAdmin(): Promise<{ isAdmin: boolean; userId?: string; email?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { isAdmin: false }
  }

  const userEmail = (user.email ?? '').toLowerCase().trim()
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  // 1. Check if user's email matches ADMIN_EMAILS environment variable
  if (userEmail && adminEmails.includes(userEmail)) {
    // If profiles table exists, ensure this user has role 'admin'
    try {
      await supabase.rpc('set_admin_role_by_email', { admin_email: userEmail })
    } catch {
      // Fallback: try direct upsert if service role client available
      try {
        const adminClient = getServiceRoleClient() || supabase
        await adminClient
          .from('profiles')
          .upsert({
            id: user.id,
            email: userEmail,
            role: 'admin',
            display_name: user.user_metadata?.full_name || user.user_metadata?.name || userEmail.split('@')[0],
            updated_at: new Date().toISOString(),
          })
      } catch {
        // Ignore if table not yet created
      }
    }
    return { isAdmin: true, userId: user.id, email: userEmail }
  }

  // 2. Check profile record in database
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role === 'admin') {
      return { isAdmin: true, userId: user.id, email: userEmail }
    }
  } catch {
    // Ignore error
  }

  return { isAdmin: false, userId: user.id, email: userEmail }
}

/**
 * Fetch all members summary for the administrator dashboard.
 */
export async function getAdminMembersSummary(): Promise<{
  members?: MemberSummary[]
  error?: string
  migrationNeeded?: boolean
}> {
  const adminCheck = await checkIsAdmin()
  if (!adminCheck.isAdmin) {
    return { error: 'Unauthorized: Admin privileges required.' }
  }

  const supabase = await createClient()
  const privilegedClient = getServiceRoleClient() || supabase

  // First try RPC get_admin_member_stats
  try {
    const { data: rpcData, error: rpcError } = await privilegedClient.rpc('get_admin_member_stats')
    if (!rpcError && rpcData) {
      const members: MemberSummary[] = rpcData.map((row: any) => ({
        id: row.id,
        email: row.email || `user_${row.id.substring(0, 6)}@app`,
        display_name: row.display_name || 'Member',
        role: row.role as MemberRole,
        created_at: row.created_at,
        workouts_count: Number(row.workouts_count || 0),
        sets_count: Number(row.sets_count || 0),
        last_workout_date: row.last_workout_date || null,
        active_days_30d: Number(row.active_days_30d || 0),
      }))
      return { members }
    }
  } catch {
    // Fall back to direct table queries
  }

  // Fallback: Query profiles table directly
  try {
    const { data: profiles, error: profilesError } = await privilegedClient
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profilesError) {
      if (profilesError.code === '42P01' || profilesError.message.includes('profiles')) {
        return {
          migrationNeeded: true,
          error: 'Profiles table not found. Please run the 20261105_add_profiles_and_admin.sql migration in Supabase SQL Editor.',
        }
      }
      return { error: profilesError.message }
    }

    // Also get workouts count and sets count per member
    const { data: workouts } = await privilegedClient
      .from('workouts')
      .select('id, user_id, date')

    const { data: sets } = await privilegedClient
      .from('workout_sets')
      .select('id, workout_id')

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

    // Create lookup sets per workout
    const setsCountByWorkout: Record<string, number> = {}
    sets?.forEach((s) => {
      setsCountByWorkout[s.workout_id] = (setsCountByWorkout[s.workout_id] || 0) + 1
    })

    const members: MemberSummary[] = (profiles || []).map((p) => {
      const memberWorkouts = (workouts || []).filter((w) => w.user_id === p.id)
      const workoutsCount = memberWorkouts.length
      let setsCount = 0
      let latestDate: string | null = null
      const activeDays30dSet = new Set<string>()

      memberWorkouts.forEach((w) => {
        setsCount += setsCountByWorkout[w.id] || 0
        if (!latestDate || w.date > latestDate) {
          latestDate = w.date
        }
        if (w.date >= thirtyDaysAgoStr) {
          activeDays30dSet.add(w.date)
        }
      })

      return {
        id: p.id,
        email: p.email || `user_${p.id.substring(0, 6)}@app`,
        display_name: p.display_name || 'Member',
        role: (p.role as MemberRole) || 'member',
        created_at: p.created_at || new Date().toISOString(),
        workouts_count: workoutsCount,
        sets_count: setsCount,
        last_workout_date: latestDate,
        active_days_30d: activeDays30dSet.size,
      }
    })

    return { members }
  } catch (err: any) {
    return { error: err?.message || 'Failed to fetch members.' }
  }
}

/**
 * Fetch detailed workout history and statistics for a specific member.
 */
export async function getMemberFullDetails(memberId: string): Promise<{
  details?: MemberFullDetails
  error?: string
}> {
  const adminCheck = await checkIsAdmin()
  if (!adminCheck.isAdmin) {
    return { error: 'Unauthorized: Admin privileges required.' }
  }

  const supabase = await createClient()
  const privilegedClient = getServiceRoleClient() || supabase

  try {
    // 1. Fetch profile
    const { data: profile, error: profileErr } = await privilegedClient
      .from('profiles')
      .select('*')
      .eq('id', memberId)
      .single()

    if (profileErr || !profile) {
      return { error: profileErr?.message || 'Member profile not found.' }
    }

    // 2. Fetch member workouts with workout sets and exercises
    const { data: workoutsData, error: workoutsErr } = await privilegedClient
      .from('workouts')
      .select(`
        id,
        date,
        title,
        notes,
        created_at,
        workout_sets (
          id,
          set_number,
          weight_kg,
          reps,
          distance_km,
          duration_seconds,
          tag,
          is_completed,
          exercises (
            id,
            name_zh,
            name_en,
            name_hu,
            category
          )
        )
      `)
      .eq('user_id', memberId)
      .order('date', { ascending: false })

    if (workoutsErr) {
      return { error: workoutsErr.message }
    }

    // 3. Fetch custom exercises created by this member
    const { data: customExercisesData } = await privilegedClient
      .from('exercises')
      .select('id, name_hu, name_en, name_zh, category, calculation_type, created_at')
      .eq('user_id', memberId)
      .order('created_at', { ascending: false })

    // Aggregate muscle distribution
    const categoryCountMap: Record<string, number> = {}
    let totalSets = 0

    const workouts: MemberWorkoutDetail[] = (workoutsData || []).map((w: any) => {
      const sets = w.workout_sets || []
      totalSets += sets.length

      // Group exercises within this workout
      const exerciseMap: Record<string, { name_zh: string | null; name_en: string | null; name_hu: string | null; category: string; set_count: number }> = {}

      sets.forEach((s: any) => {
        const ex = Array.isArray(s.exercises) ? s.exercises[0] : s.exercises
        if (ex) {
          const exId = ex.id
          if (!exerciseMap[exId]) {
            exerciseMap[exId] = {
              name_zh: ex.name_zh,
              name_en: ex.name_en,
              name_hu: ex.name_hu,
              category: ex.category,
              set_count: 0,
            }
          }
          exerciseMap[exId].set_count += 1

          const cat = ex.category || 'other'
          categoryCountMap[cat] = (categoryCountMap[cat] || 0) + 1
        }
      })

      return {
        id: w.id,
        date: w.date,
        title: w.title,
        notes: w.notes,
        created_at: w.created_at,
        sets_count: sets.length,
        exercises: Object.values(exerciseMap),
      }
    })

    const muscleDistribution = Object.entries(categoryCountMap).map(([category, count]) => ({
      category,
      count,
    })).sort((a, b) => b.count - a.count)

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]
    const activeDays30d = new Set(
      (workoutsData || [])
        .filter((w: any) => w.date >= thirtyDaysAgoStr)
        .map((w: any) => w.date)
    ).size

    const memberSummary: MemberSummary = {
      id: profile.id,
      email: profile.email || `user_${profile.id.substring(0, 6)}@app`,
      display_name: profile.display_name || 'Member',
      role: (profile.role as MemberRole) || 'member',
      created_at: profile.created_at,
      workouts_count: workouts.length,
      sets_count: totalSets,
      last_workout_date: workouts[0]?.date || null,
      active_days_30d: activeDays30d,
    }

    return {
      details: {
        member: memberSummary,
        workouts,
        customExercises: customExercisesData || [],
        muscleDistribution,
      },
    }
  } catch (err: any) {
    return { error: err?.message || 'Failed to load member details.' }
  }
}

/**
 * Update a member's role (admin <-> member).
 */
export async function updateMemberRole(
  memberId: string,
  newRole: MemberRole
): Promise<{ success?: boolean; error?: string }> {
  const adminCheck = await checkIsAdmin()
  if (!adminCheck.isAdmin) {
    return { error: 'Unauthorized: Admin privileges required.' }
  }

  // Safety: Prevent admin from demoting themselves if they are the current user
  if (adminCheck.userId === memberId && newRole !== 'admin') {
    return { error: 'You cannot demote your own account from administrator.' }
  }

  const supabase = await createClient()
  const privilegedClient = getServiceRoleClient() || supabase

  const { error } = await privilegedClient
    .from('profiles')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('id', memberId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/[locale]/admin', 'page')
  return { success: true }
}

/**
 * Update a member's display name or notes.
 */
export async function updateMemberDisplayName(
  memberId: string,
  displayName: string
): Promise<{ success?: boolean; error?: string }> {
  const adminCheck = await checkIsAdmin()
  if (!adminCheck.isAdmin) {
    return { error: 'Unauthorized: Admin privileges required.' }
  }

  const cleanName = displayName.trim()
  if (!cleanName) {
    return { error: 'Display name cannot be empty.' }
  }

  const supabase = await createClient()
  const privilegedClient = getServiceRoleClient() || supabase

  const { error } = await privilegedClient
    .from('profiles')
    .update({ display_name: cleanName, updated_at: new Date().toISOString() })
    .eq('id', memberId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/[locale]/admin', 'page')
  return { success: true }
}

/**
 * Delete a specific workout recorded by any member (admin cleanup).
 */
export async function deleteMemberWorkout(
  workoutId: string
): Promise<{ success?: boolean; error?: string }> {
  const adminCheck = await checkIsAdmin()
  if (!adminCheck.isAdmin) {
    return { error: 'Unauthorized: Admin privileges required.' }
  }

  const supabase = await createClient()
  const privilegedClient = getServiceRoleClient() || supabase

  const { error } = await privilegedClient
    .from('workouts')
    .delete()
    .eq('id', workoutId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/[locale]/admin', 'page')
  return { success: true }
}
