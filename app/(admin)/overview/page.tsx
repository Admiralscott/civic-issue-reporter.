import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import OverviewTable from '@/components/admin/OverviewTable'
import GovDashboardTemplate from '@/components/admin/GovDashboardTemplate'
import { format, subDays } from '@/lib/utils/date'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = { title: 'Admin Overview' }

export default async function OverviewPage({
  searchParams,
}: {
  searchParams?: { status?: string }
}) {
  const supabase = createClient()

  const { data: reports } = await supabase
    .from('reports')
    .select('*, departments(name)')
    .order('created_at', { ascending: false })
    .limit(500)

  const { count: totalReports } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })

  const { count: totalCitizens } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })

  const { count: activeDepts } = await supabase
    .from('departments')
    .select('*', { count: 'exact', head: true })

  const allReports = reports ?? []
  const resolvedReports = allReports.filter((r) => r.status === 'resolved' || r.status === 'closed')
  const resolvedCount = resolvedReports.length
  const pendingCount = allReports.filter((r) => r.status === 'pending').length
  const inProgressCount = allReports.filter((r) => r.status === 'in_progress' || r.status === 'acknowledged').length

  const resolutionRate = totalReports ? Math.round((resolvedCount / totalReports) * 100) : 0

  const today = new Date()
  const activityData = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(today, 6 - i)
    const dateStr = format(day, 'yyyy-MM-dd')
    return {
      time: format(day, 'MMM d'),
      count: allReports.filter((r) => r.created_at.startsWith(dateStr)).length,
    }
  })

  const progressBars = [
    { label: 'Resolved Issues', current: resolvedCount, total: totalReports ?? 10, color: '#8bc34a' },
    { label: 'In Progress Issues', current: inProgressCount, total: totalReports ?? 10, color: '#3498db' },
    { label: 'Pending Issues', current: pendingCount, total: totalReports ?? 10, color: '#ff851b' },
    { label: 'Active Departments', current: activeDepts ?? 4, total: 10, color: '#d35400' },
  ]

  return (
    <div className="space-y-6">
      <GovDashboardTemplate
        metrics={{
          totalReports: totalReports ?? 0,
          totalCitizens: totalCitizens ?? 0,
          resolvedToday: resolvedCount,
          activeDepartments: activeDepts ?? 4,
          resolutionRate,
          slaOnTimeRate: 88,
          avgResolutionHours: 2.4,
        }}
        activityData={activityData}
        progressBars={progressBars}
        resolvedReports={resolvedReports as any}
      />

      <div id="city-issue-registry" className="pt-4 scroll-mt-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">City Issue Registry</h2>
        <OverviewTable reports={allReports as any} initialStatus={searchParams?.status} />
      </div>
    </div>
  )
}
