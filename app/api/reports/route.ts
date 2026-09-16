import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status   = searchParams.get('status')
  const category = searchParams.get('category')
  const dept     = searchParams.get('dept')
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
  const offset   = parseInt(searchParams.get('offset') ?? '0')

  const supabase = createClient()
  let query = supabase
    .from('reports')
    .select('*, departments(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status)   query = query.eq('status', status)
  if (category) query = query.eq('category', category)
  if (dept)     query = query.eq('assigned_dept_id', dept)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data, count })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { data, error } = await supabase
    .from('reports')
    .insert({ ...body, citizen_id: user.id })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data }, { status: 201 })
}
