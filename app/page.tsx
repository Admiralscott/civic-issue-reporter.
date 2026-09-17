import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Home() {
  const reqHeaders = headers()
  const host = reqHeaders.get('host') ?? ''
  const isPort3001 = host.includes(':3001')
  const surface = process.env.NEXT_PUBLIC_APP_SURFACE || (isPort3001 ? 'admin' : 'citizen')

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (surface === 'admin') {
    if (!user) redirect('/auth/admin')

    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = (data as any)?.role
    if (role === 'department') redirect('/queue')
    if (role === 'admin') redirect('/overview')
    redirect('/auth/admin')
  } else {
    if (!user) redirect('/auth/login')

    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = (data as any)?.role
    if (role === 'department') redirect('/queue')
    if (role === 'admin') redirect('/overview')
    redirect('/report')
  }
}
