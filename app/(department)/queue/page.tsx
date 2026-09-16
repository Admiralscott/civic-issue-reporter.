import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ReportQueue from '@/components/department/ReportQueue'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = { title: 'Report Queue' }

export default async function QueuePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="p-8 text-center text-gray-500">
        Please sign in to access the department queue.
      </div>
    )
  }

  const { data: userData } = await supabase
    .from('users')
    .select('department_id, departments(name)')
    .eq('id', user.id)
    .single()

  const deptId = (userData as any)?.department_id

  const { data: reports } = await supabase
    .from('reports')
    .select('*, departments(name)')
    .order('priority_score', { ascending: false })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Report Queue</h1>
        <p className="text-gray-500 text-sm mt-1">
          {(userData as any)?.departments?.name ?? 'All Departments Queue'} · {(reports ?? []).length} reports
        </p>
      </div>
      <ReportQueue reports={(reports ?? []) as any} />
    </div>
  )
}
