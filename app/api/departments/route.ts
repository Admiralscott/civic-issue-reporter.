import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('departments')
    .select('id, name, description, categories, zone')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: ud } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (ud?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > 150) {
    return NextResponse.json({ error: 'Department name is required and must be at most 150 characters' }, { status: 400 })
  }

  const insertData = {
    name,
    description: typeof body.description === 'string' ? body.description.slice(0, 1000) : null,
    email: typeof body.email === 'string' ? body.email.slice(0, 254) : null,
    categories: Array.isArray(body.categories) ? body.categories : [],
    zone: typeof body.zone === 'string' ? body.zone.slice(0, 100) : null,
  }

  const { data, error } = await supabase
    .from('departments')
    .insert(insertData)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data }, { status: 201 })
}
