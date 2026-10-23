import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function getCurrentUser() {
  const supabase = createClient()
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) return user
  } catch (err) {
    console.warn('Server auth: getUser failed, checking demo cookie:', err)
  }

  const cookieStore = cookies()
  const demoCookie = cookieStore.get('civic_demo_user')
  if (demoCookie?.value) {
    try {
      return JSON.parse(decodeURIComponent(demoCookie.value))
    } catch (err) {
      console.warn('Server auth: Failed to parse demo cookie:', err)
      return { id: 'demo-citizen-id', role: 'citizen', email: 'citizen@demo.gov', full_name: 'Citizen Demo User' }
    }
  }

  return null
}
