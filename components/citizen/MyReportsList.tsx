'use client'

import { useEffect, useMemo, useState } from 'react'
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
  const [reports, setReports] = useState<Report[]>(allReports)
  const userReports = useMemo(() => reports.filter((r) => r.citizen_id === userId), [reports, userId])
  const initialTab = userReports.length > 0 ? 'mine' : 'all'
  const [tab, setTab] = useState<'mine' | 'all'>(initialTab)

  useEffect(() => {
    setReports(allReports)
  }, [allReports])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('realtime_my_reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, (payload) => {
        setReports((current) => {
          if (payload.eventType === 'INSERT') {
            const next = payload.new as Report
            return current.some((r) => r.id === next.id) ? current : [next, ...current]
          }
          if (payload.eventType === 'UPDATE') {
            const next = payload.new as Report
            return current.some((r) => r.id === next.id)
              ? current.map((r) => (r.id === next.id ? next : r))
              : [next, ...current]
          }
          if (payload.eventType === 'DELETE') {
            const old = payload.old as Report
            return current.filter((r) => r.id !== old.id)
          }
          return current
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const displayReports = tab === 'mine' ? userReports : reports

  return (
    <div className="space-y-4">
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
          All Community Reports ({reports.length})
        </button>
      </div>

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
