'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Report } from '@/lib/types'
import ReportCard from '@/components/citizen/ReportCard'

export default function MyReportsList({ reports }: { reports: Report[] }) {
  const router = useRouter()

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

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <ReportCard key={report.id} report={report} />
      ))}
    </div>
  )
}
