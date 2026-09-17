import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import DepartmentManager from '@/components/admin/DepartmentManager'
import Link from 'next/link'

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
    <div className="space-y-4">
      {/* In-page Back button */}
      <div>
        <Link
          href="/overview"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition shadow-xs"
        >
          ← Back to Overview
        </Link>
      </div>

      <DepartmentManager departments={(departments ?? []) as any} />
    </div>
  )
}
