import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import DepartmentCardList from '@/components/department/DepartmentCardList'
import { CONFIGURED_DEPARTMENTS } from '@/lib/utils/department-helpers'
import type { Department } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Department Portals · CivicTrack',
  description: 'Select a municipal department to view assigned civic reports and manage resolution workflows.',
}

export default async function QueuePage({
  searchParams,
}: {
  searchParams?: { dept?: string }
}) {
  // If dept query param is provided, seamlessly forward to the department route
  if (searchParams?.dept) {
    redirect(`/queue/${searchParams.dept}`)
  }

  const supabase = createClient()
  const user = await getCurrentUser()

  if (!user) {
    return (
      <div className="p-8 text-center text-gray-500">
        Please sign in to access the department queue.
      </div>
    )
  }

  let deptName = 'Municipal Department'
  if (user.id) {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('role, department_id, departments(name)')
        .eq('id', user.id)
        .maybeSingle()

      if ((userData as any)?.departments?.name) {
        deptName = (userData as any).departments.name
      }
    } catch {}
  }

  let departments: Department[] = []
  let deptError: string | null = null
  const { data: dbDepts, error: deptQueryErr } = await supabase
    .from('departments')
    .select('*')
    .order('name')

  if (deptQueryErr) {
    console.error('[QueuePage] Departments query failed:', deptQueryErr.code, deptQueryErr.message)
    deptError = deptQueryErr.message
    departments = CONFIGURED_DEPARTMENTS // fallback to hardcoded list so the UI isn't empty
  } else {
    departments = dbDepts && dbDepts.length > 0 ? dbDepts : CONFIGURED_DEPARTMENTS
  }

  let reports: any[] = []
  let reportsError: string | null = null
  const { data: dbReports, error: repQueryErr } = await supabase
    .from('reports')
    .select('*, departments(name)')
    .order('priority_score', { ascending: false })

  if (repQueryErr) {
    console.error('[QueuePage] Reports query failed:', repQueryErr.code, repQueryErr.message)
    reportsError = repQueryErr.message
    reports = []
  } else {
    reports = dbReports ?? []
  }

  return (
    <>
      {(deptError || reportsError) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-semibold text-red-800">
          ⚠️ Database query failed{deptError ? ` (departments: ${deptError})` : ''}{reportsError ? ` (reports: ${reportsError})` : ''}. Check Supabase connection and RLS policies.
        </div>
      )}
      <DepartmentCardList
        initialDepartments={departments}
        initialReports={reports}
        userDeptName={deptName}
      />
    </>
  )
}
