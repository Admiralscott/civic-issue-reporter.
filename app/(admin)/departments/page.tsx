import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import DepartmentManager from '@/components/admin/DepartmentManager'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = { title: 'Departments Oversight' }

export default async function DepartmentsPage() {
  const supabase = createClient()

  const { data: departments } = await supabase
    .from('departments')
    .select('*, reports(*, status_history(*, users(full_name)))')
    .order('name')

  return (
    <div>
      <DepartmentManager departments={(departments ?? []) as any} />
    </div>
  )
}
