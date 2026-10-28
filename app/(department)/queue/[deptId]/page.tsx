import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import DepartmentIssueQueue from '@/components/department/DepartmentIssueQueue'
import { CONFIGURED_DEPARTMENTS } from '@/lib/utils/department-helpers'
import Link from 'next/link'
import type { Department } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata({ params }: { params: { deptId: string } }): Promise<Metadata> {
  if (params.deptId === 'unassigned') {
    return { title: 'Unassigned Issues · Department Portal' }
  }
  const dept = CONFIGURED_DEPARTMENTS.find((d) => d.id === params.deptId)
  return {
    title: dept ? `${dept.name} Issues · Department Portal` : 'Department Issues · Department Portal',
  }
}

export default async function DepartmentQueuePage({
  params,
}: {
  params: { deptId: string }
}) {
  const supabase = createClient()
  const user = await getCurrentUser()

  if (!user) {
    return (
      <div className="p-8 text-center text-gray-500">
        Please sign in to access the department queue.
      </div>
    )
  }

  const isUnassigned = params.deptId === 'unassigned'
  let department: Department | null = null

  if (!isUnassigned) {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('id', params.deptId)
      .maybeSingle()

    if (error) {
      console.error('[DeptQueuePage] Department query failed:', error.code, error.message)
      // Fall back to the in-memory configured list
      department = CONFIGURED_DEPARTMENTS.find((d) => d.id === params.deptId) || null
    } else {
      department = data ?? (CONFIGURED_DEPARTMENTS.find((d) => d.id === params.deptId) || null)
    }

    if (!department) {
      return (
        <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border border-gray-200 text-center shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Department Not Found</h2>
          <p className="text-gray-500 text-xs mb-4">
            The requested municipal department ID does not exist or has been removed.
          </p>
          <Link
            href="/queue"
            className="inline-block px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-semibold hover:bg-orange-700 transition"
          >
            ← Return to Departments
          </Link>
        </div>
      )
    }
  }

  let reports: any[] = []
  let reportsError: string | null = null

  const { data: dbReports, error: repQueryErr } = await supabase
    .from('reports')
    .select('*, departments(name)')
    .order('priority_score', { ascending: false })

  if (repQueryErr) {
    console.error('[DeptQueuePage] Reports query failed:', repQueryErr.code, repQueryErr.message)
    reportsError = repQueryErr.message
    reports = []
  } else {
    reports = dbReports ?? []
  }

  return (
    <>
      {reportsError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-semibold text-red-800">
          ⚠️ Failed to load reports from database: {reportsError}. Check Supabase connection and RLS policies.
        </div>
      )}
      <DepartmentIssueQueue
        department={department}
        initialReports={reports}
        isUnassigned={isUnassigned}
      />
    </>
  )
}
