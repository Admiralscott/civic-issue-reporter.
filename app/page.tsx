import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export default async function Home() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  switch ((data as any)?.role) {
    case 'citizen': redirect('/report')
    case 'department': redirect('/queue')
    case 'admin': redirect('/overview')
    default: redirect('/auth/login')
  }
}
