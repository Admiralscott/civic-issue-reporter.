import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ReportCategory } from '@/lib/types'

const CATEGORIES = new Set<ReportCategory>([
  'road_damage', 'water_leak', 'electrical', 'garbage',
  'graffiti', 'noise', 'emergency', 'other',
])

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const category = searchParams.get('category')
  const dept = searchParams.get('dept')
  const requestedLimit = Number.parseInt(searchParams.get('limit') ?? '50', 10)
  const requestedOffset = Number.parseInt(searchParams.get('offset') ?? '0', 10)
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 50
  const offset = Number.isFinite(requestedOffset) ? Math.max(requestedOffset, 0) : 0

  const { data: actor } = await supabase
    .from('users')
    .select('role, department_id')
    .eq('id', user.id)
    .single()

  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let query = supabase
    .from('reports')
    .select('*, departments(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (actor.role === 'citizen') {
    query = query.eq('citizen_id', user.id)
  } else if (actor.role === 'department') {
    if (!actor.department_id) return NextResponse.json({ error: 'Department not assigned' }, { status: 403 })
    query = query.eq('assigned_dept_id', actor.department_id)
  }

  if (status) query = query.eq('status', status)
  if (category) {
    if (!CATEGORIES.has(category as ReportCategory)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    query = query.eq('category', category)
  }
  if (dept && actor.role === 'admin') query = query.eq('assigned_dept_id', dept)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data, count })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const description = body.description == null ? null : String(body.description).trim()
  const category = body.category

  if (!title || title.length > 100) {
    return NextResponse.json({ error: 'Title is required and must be at most 100 characters' }, { status: 400 })
  }
  if (description && description.length > 5000) {
    return NextResponse.json({ error: 'Description is too long' }, { status: 400 })
  }
  if (typeof category !== 'string' || !CATEGORIES.has(category as ReportCategory)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  const insertData: Record<string, unknown> = {
    citizen_id: user.id,
    title,
    description,
    category,
  }

  if (typeof body.address === 'string') insertData.address = body.address.slice(0, 500)
  if (body.location !== undefined) insertData.location = body.location
  if (Array.isArray(body.photo_urls)) {
    if (body.photo_urls.length > 3 || body.photo_urls.some((url: unknown) => typeof url !== 'string')) {
      return NextResponse.json({ error: 'Invalid photo_urls' }, { status: 400 })
    }
    insertData.photo_urls = body.photo_urls
  }

  const { data, error } = await supabase
    .from('reports')
    .insert(insertData)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data }, { status: 201 })
}
