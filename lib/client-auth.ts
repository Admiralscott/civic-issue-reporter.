import { createClient } from '@/lib/supabase/client'

export async function getClientUser() {
  const supabase = createClient()
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) return user
  } catch (err) {
    console.warn('Client auth: getUser failed, falling back to demo session:', err)
  }

  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|; )civic_demo_user=([^;]*)/)
    if (match) {
      try {
        return JSON.parse(decodeURIComponent(match[1]))
      } catch (err) {
        console.warn('Client auth: Failed to parse demo user cookie:', err)
        return { id: 'demo-citizen-id', role: 'citizen', email: 'citizen@demo.gov', full_name: 'Citizen Demo User' }
      }
    }
  }

  return { id: 'demo-citizen-id', role: 'citizen', email: 'citizen@demo.gov', full_name: 'Citizen Demo User' }
}
