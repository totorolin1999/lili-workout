'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Sends a Magic Link email to the user.
 * Email system messages are intentionally in English per spec.
 */
export async function signInWithMagicLink(email: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) return { error: error.message }

  return {}
}

/**
 * Signs the current user out.
 */
export async function signOut(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return {}
}
