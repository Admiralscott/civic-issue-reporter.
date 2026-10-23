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
  try {
    const { data: dbDepts, error: deptError } = await supabase
      .from('departments')
      .select('*')
      .order('name')

    if (deptError || !dbDepts || dbDepts.length === 0) {
      departments = CONFIGURED_DEPARTMENTS
    } else {
      departments = dbDepts
    }
  } catch {
    departments = CONFIGURED_DEPARTMENTS
  }

  let reports: any[] = []
  try {
    const { data: dbReports, error: repError } = await supabase
      .from('reports')
      .select('*, departments(name)')
      .order('priority_score', { ascending: false })

    if (repError || !dbReports) {
      const { MOCK_REPORTS } = await import('@/lib/utils/mock-data')
      reports = MOCK_REPORTS
    } else {
      reports = dbReports
    }
  } catch {
    const { MOCK_REPORTS } = await import('@/lib/utils/mock-data')
    reports = MOCK_REPORTS
  }

  return (
    <DepartmentCardList
      initialDepartments={departments}
      initialReports={reports}
      userDeptName={deptName}
    />
  )
}
