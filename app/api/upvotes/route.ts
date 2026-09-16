import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { report_id } = await request.json()

  const { data: existing } = await supabase
    .from('report_upvotes')
    .select('id')
    .eq('report_id', report_id)
    .eq('citizen_id', user.id)
    .single()

  if (existing) {
    await supabase.from('report_upvotes').delete().eq('report_id', report_id).eq('citizen_id', user.id)
    await (supabase.rpc as any)('decrement_upvote', { p_report_id: report_id })
    return NextResponse.json({ action: 'removed' })
  }

  await supabase.from('report_upvotes').insert({ report_id, citizen_id: user.id } as any)
  await (supabase.rpc as any)('increment_upvote', { p_report_id: report_id })
  return NextResponse.json({ action: 'added' })
}
