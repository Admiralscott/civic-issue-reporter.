import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import AnalyticsCharts from '@/components/admin/AnalyticsCharts'
import { format, subDays } from '@/lib/utils/date'
import type { ReportStatus, ReportCategory } from '@/lib/types'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Analytics' }

export default async function AnalyticsPage() {
  const supabase = createClient()

  const { data: reportsData } = await supabase
    .from('reports')
    .select('status, category, created_at, resolved_at, priority_score')

  const allReports = (reportsData ?? []) as Array<{
    status: ReportStatus
    category: ReportCategory
    created_at: string
    resolved_at: string | null
    priority_score: number
  }>

  if (allReports.length === 0) return <div>No data available.</div>

  const statusCounts: Record<string, number> = {}
  const categoryCounts: Record<string, number> = {}

  allReports.forEach((r) => {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1
    categoryCounts[r.category] = (categoryCounts[r.category] ?? 0) + 1
  })

  const today = new Date()
  const dailyCounts = Array.from({ length: 30 }, (_, i) => {
    const day = subDays(today, 29 - i)
    const dateStr = format(day, 'yyyy-MM-dd')
    return {
      date: format(day, 'MMM d'),
      count: allReports.filter((r) => r.created_at.startsWith(dateStr)).length,
    }
  })

  const resolved = allReports.filter((r) => r.resolved_at)
  const avgResolutionHours = resolved.length
    ? Math.round(
        resolved.reduce((sum, r) => {
          return sum + (new Date(r.resolved_at!).getTime() - new Date(r.created_at).getTime()) / 3600000
        }, 0) / resolved.length,
      )
    : 0

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

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h1>
      <AnalyticsCharts
        statusCounts={statusCounts}
        categoryCounts={categoryCounts}
        dailyCounts={dailyCounts}
        metrics={{
          total: allReports.length,
          pending: statusCounts['pending'] ?? 0,
          inProgress: (statusCounts['in_progress'] ?? 0) + (statusCounts['acknowledged'] ?? 0),
          resolved: (statusCounts['resolved'] ?? 0) + (statusCounts['closed'] ?? 0),
          avgResolutionHours,
        }}
      />
    </div>
  )
}
