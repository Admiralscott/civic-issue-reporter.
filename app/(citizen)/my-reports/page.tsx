import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import MyReportsList from '@/components/citizen/MyReportsList'
import Link from 'next/link'
import { FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = { title: 'My Reports' }

export default async function MyReportsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: reports } = await supabase
    .from('reports')
    .select('*')
    .eq('citizen_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Reports</h1>
        <Link href="/report" className="text-sm text-blue-600 font-medium hover:underline">
          + New
        </Link>
      </div>

      {!reports || reports.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No reports yet</p>
          <p className="text-gray-400 text-sm mt-1 mb-6">Be the first to report a community issue</p>
          <Link href="/report"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
            Submit Your First Report
          </Link>
        </div>
      ) : (
        <MyReportsList reports={(reports ?? []) as any} />
      )}
    </div>
  )
}