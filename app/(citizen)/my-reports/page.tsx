import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MyReportsList from '@/components/citizen/MyReportsList'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = { title: 'My Requests' }

export default async function MyReportsPage() {
  const user = await getCurrentUser()
  const supabase = createClient()

  if (!user) {
    redirect('/auth/login')
  }

  let allReports: any[] = []
  let queryError: string | null = null

  const { data: reports, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    // Log the real Supabase error for diagnosis; show it in the UI in dev.
    console.error('[MyReports] Supabase query failed:', error.code, error.message)
    queryError = error.message
    allReports = []
  } else {
    allReports = reports ?? []
  }

  return (
    <div>
      {/* Query error banner — shown when the DB query itself fails */}
      {queryError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-semibold text-red-800 flex items-center justify-between shadow-xs">
          <span>⚠️ Database query failed: {queryError}</span>
          <span className="text-[10px] text-red-600" title="Check Supabase URL, anon key, and RLS policies in .env.local">Check DB config</span>
        </div>
      )}

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

      <MyReportsList allReports={allReports} userId={user.id} queryError={queryError} />
    </div>
  )
}
