import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MyReportsList from '@/components/citizen/MyReportsList'
import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = { title: 'My Requests' }

export default async function MyReportsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: reports } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })

  const allReports = (reports ?? []) as any[]

  return (
    <div>
      {/* In-page Back button */}
      <div className="mb-4">
        <Link
          href="/report"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition shadow-xs"
        >
          ← Back to Report Issue
        </Link>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-wide uppercase">My Requests & Track Status</h1>
          <p className="text-xs text-gray-500 font-medium">Track your submitted issues & community resolution status</p>
        </div>
        <Link
          href="/report"
          className="inline-flex items-center gap-1 text-xs font-bold text-white bg-[#C4511E] hover:bg-[#A83D0C] px-3 py-2 rounded-xl shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Report</span>
        </Link>
      </div>

      {allReports.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 shadow-sm">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-800 font-bold text-base">No reports found</p>
          <p className="text-gray-400 text-xs mt-1 mb-6 max-w-xs mx-auto">No civic issue reports have been submitted yet.</p>
          <Link href="/report"
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#C4511E] hover:bg-[#A83D0C] text-white rounded-xl text-xs font-extrabold shadow-md transition">
            <Plus className="w-4 h-4" />
            Submit Your First Report
          </Link>
        </div>
      ) : (
        <MyReportsList allReports={allReports} userId={user.id} />
      )}
    </div>
  )
}