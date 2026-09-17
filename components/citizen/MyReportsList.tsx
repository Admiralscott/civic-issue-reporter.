'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Report } from '@/lib/types'
import ReportCard from '@/components/citizen/ReportCard'

export default function MyReportsList({
  allReports,
  userId,
}: {
  allReports: Report[]
  userId: string
}) {
  const router = useRouter()
  const userReports = allReports.filter((r) => r.citizen_id === userId)
  const initialTab = userReports.length > 0 ? 'mine' : 'all'
  const [tab, setTab] = useState<'mine' | 'all'>(initialTab)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('realtime_my_reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        router.refresh()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  const displayReports = tab === 'mine' ? userReports : allReports

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 p-1 bg-gray-200/80 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setTab('mine')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            tab === 'mine'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          My Submissions ({userReports.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            tab === 'all'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All Community Reports ({allReports.length})
        </button>
      </div>

      {/* Reports List */}
      {displayReports.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
          <p className="text-gray-600 font-bold text-sm">No reports in this view</p>
          <p className="text-gray-400 text-xs mt-1">Switch tabs or submit a new report using the button above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayReports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  )
}
