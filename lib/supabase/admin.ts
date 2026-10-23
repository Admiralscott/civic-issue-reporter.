import { createClient } from '@supabase/supabase-js'

/**
 * Server-only admin client with elevated service_role privileges.
 * Used exclusively in API routes / server actions where authenticated
 * business logic (like status transitions & system history logs) has been verified.
 */
export function createAdminClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()

  if (!url || !serviceKey) {
    throw new Error('Supabase admin configuration missing (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)')
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
