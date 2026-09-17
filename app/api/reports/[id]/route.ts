import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ReportCategory, ReportStatus } from '@/lib/types'

const CATEGORIES = new Set<ReportCategory>([
  'road_damage', 'water_leak', 'electrical', 'garbage',
  'graffiti', 'noise', 'emergency', 'other',
])

const STATUSES = new Set<ReportStatus>([
  'pending', 'acknowledged', 'in_progress', 'resolved', 'closed', 'reopened',
])

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('reports')
    .select('*, departments(name), users(full_name, phone)')
    .eq('id', params.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: actor } = await supabase
    .from('users')
    .select('role, department_id')
    .eq('id', user.id)
    .single()

  if (!actor || !['admin', 'department'].includes(actor.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: report } = await supabase
    .from('reports')
    .select('status, assigned_dept_id')
    .eq('id', params.id)
    .single()

  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (actor.role === 'department' && report.assigned_dept_id !== actor.department_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const updateFields: Record<string, unknown> = {}
  let statusChanged = false
  let newStatus: ReportStatus | null = null
  const note = typeof body._note === 'string' ? body._note.slice(0, 2000) : null

  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !STATUSES.has(body.status as ReportStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    newStatus = body.status as ReportStatus
    statusChanged = newStatus !== report.status
    updateFields.status = newStatus
    if (newStatus === 'resolved') updateFields.resolved_at = new Date().toISOString()
    if (newStatus !== 'resolved' && body.resolved_at === undefined) updateFields.resolved_at = null
  }

  if (body.resolution_photo_url !== undefined) {
    if (typeof body.resolution_photo_url !== 'string' && body.resolution_photo_url !== null) {
      return NextResponse.json({ error: 'Invalid resolution photo URL' }, { status: 400 })
    }
    updateFields.resolution_photo_url = body.resolution_photo_url
  }
  if (body.resolved_at !== undefined && newStatus !== 'resolved') {
    if (actor.role !== 'admin' || (typeof body.resolved_at !== 'string' && body.resolved_at !== null)) {
      return NextResponse.json({ error: 'Invalid resolved_at value' }, { status: 400 })
    }
    updateFields.resolved_at = body.resolved_at
  }
  if (body.priority_score !== undefined) {
    if (actor.role !== 'admin' || typeof body.priority_score !== 'number' || !Number.isFinite(body.priority_score)) {
      return NextResponse.json({ error: 'Invalid priority_score' }, { status: 400 })
    }
    updateFields.priority_score = body.priority_score
  }
  if (body.category !== undefined) {
    if (actor.role !== 'admin' || typeof body.category !== 'string' || !CATEGORIES.has(body.category as ReportCategory)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    updateFields.category = body.category
  }

  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json({ error: 'No allowed fields supplied' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('reports')
    .update(updateFields)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (statusChanged && newStatus) {
    const { error: historyError } = await supabase.from('status_history').insert({
      report_id: params.id,
      changed_by: user.id,
      old_status: report.status,
      new_status: newStatus,
      note,
    })
    if (historyError) {
      return NextResponse.json({ error: 'Report updated, but activity history could not be recorded' }, { status: 500 })
    }
  }

  return NextResponse.json({ data })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('reports').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
