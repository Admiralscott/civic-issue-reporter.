import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ReportStatus } from '@/lib/types'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'You must be signed in to update report status.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { new_status, note, resolution_photo_url } = body as {
      new_status: ReportStatus
      note?: string
      resolution_photo_url?: string | null
    }

    if (!new_status) {
      return NextResponse.json({ error: 'New status is required.' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Resolve user's database role and department
    let userRole = (user as any).role ?? 'citizen'
    let userDeptId = (user as any).department_id ?? null

    if (user.id && UUID_REGEX.test(user.id)) {
      const { data: dbUser } = await admin
        .from('users')
        .select('role, department_id')
        .eq('id', user.id)
        .maybeSingle()

      if (dbUser?.role) userRole = dbUser.role
      if (dbUser?.department_id) userDeptId = dbUser.department_id
    }

    if (userRole === 'citizen') {
      return NextResponse.json(
        { error: 'Citizen accounts cannot change the official status of civic reports.' },
        { status: 403 }
      )
    }

    // Handle Mock Report in-memory updates
    if (params.id.startsWith('report-mock')) {
      const { MOCK_REPORTS } = await import('@/lib/utils/mock-data')
      const target = MOCK_REPORTS.find((m) => m.id === params.id)
      if (target) {
        target.status = new_status
        if (resolution_photo_url) target.resolution_photo_url = resolution_photo_url
        if (new_status === 'resolved') target.resolved_at = new Date().toISOString()
      }
      return NextResponse.json({ success: true, isMock: true })
    }

    // Verify report existence & department ownership
    const { data: report, error: reportErr } = await admin
      .from('reports')
      .select('id, assigned_dept_id, departments(name)')
      .eq('id', params.id)
      .maybeSingle()

    if (reportErr || !report) {
      // Fallback check in mock data
      const { MOCK_REPORTS } = await import('@/lib/utils/mock-data')
      const mockTarget = MOCK_REPORTS.find((m) => m.id === params.id)
      if (mockTarget) {
        mockTarget.status = new_status
        if (resolution_photo_url) mockTarget.resolution_photo_url = resolution_photo_url
        if (new_status === 'resolved') mockTarget.resolved_at = new Date().toISOString()
        return NextResponse.json({ success: true, isMock: true })
      }
      return NextResponse.json({ error: 'Report not found in database.' }, { status: 404 })
    }

    // Department boundary check: Department staff can only update reports assigned to their department
    if (userRole === 'department') {
      if (userDeptId && report.assigned_dept_id && report.assigned_dept_id !== userDeptId) {
        const assignedDeptName = (report as any).departments?.name ?? 'another department'
        return NextResponse.json(
          {
            error: `Permission denied: This issue is assigned to ${assignedDeptName}. Department staff can only update issues assigned to their own department.`,
          },
          { status: 403 }
        )
      }
    }

    // Execute update
    const updatePayload: Record<string, any> = {
      status: new_status,
      updated_at: new Date().toISOString(),
    }
    if (resolution_photo_url) {
      updatePayload.resolution_photo_url = resolution_photo_url
    }
    if (new_status === 'resolved') {
      updatePayload.resolved_at = new Date().toISOString()
    }

    const { error: updateErr } = await admin
      .from('reports')
      .update(updatePayload)
      .eq('id', params.id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Insert audit log in status_history
    const validUserId = user.id && UUID_REGEX.test(user.id) ? user.id : null

    await admin.from('status_history').insert({
      report_id: params.id,
      changed_by: validUserId,
      new_status,
      note: note || null,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'An unexpected error occurred while updating status.' },
      { status: 500 }
    )
  }
}
