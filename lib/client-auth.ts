import { createClient } from '@/lib/supabase/client'

/**
 * Returns the currently authenticated Supabase user on the client side.
 *
 * Returns null if the user is not signed in.
 * Only falls back to the demo cookie if it explicitly exists (set during demo login).
 * Never returns a hardcoded demo user when no session or cookie is present —
 * that would cause report inserts with citizen_id = 'demo-citizen-id', which is not
 * a valid UUID in the users table and breaks assignment and My Submissions filtering.
 */
export async function getClientUser() {
  const supabase = createClient()
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (user) return user
    if (error) {
      console.warn('[client-auth] getUser error:', error.message)
    }
  } catch (err) {
    console.warn('[client-auth] getUser exception:', err)
  }

  // Only use demo cookie when it was explicitly set (e.g. during demo login flow)
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|; )civic_demo_user=([^;]*)/)
    if (match) {
      try {
        return JSON.parse(decodeURIComponent(match[1]))
      } catch (err) {
        console.warn('[client-auth] Failed to parse demo user cookie:', err)
      }
    }
  }

  // No session and no demo cookie — return null so callers can handle unauthenticated state.
  return null
}
