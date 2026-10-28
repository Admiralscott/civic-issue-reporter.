import type { Metadata } from 'next'
import nextDynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = { title: 'Community Map' }

const MapView = nextDynamic(() => import('@/components/citizen/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[65vh] min-h-[420px] rounded-2xl bg-gray-100 animate-pulse flex items-center justify-center text-gray-400 text-sm">
      Loading community map…
    </div>
  ),
})

/**
 * Filter condition: Only show active issues (pending, in_progress, acknowledged, reopened, etc.)
 * Strictly exclude 'closed', 'resolved', and 'completed' reports from the map.
 */
function isMapActiveReport(status?: string | null): boolean {
  if (!status) return true
  const s = status.toLowerCase()
  return s !== 'closed' && s !== 'resolved' && s !== 'completed'
}

export default async function MapPage() {
  const supabase = createClient()
  let mapReports: any[] = []
  let queryError: string | null = null

  try {
    const { data: reports, error } = await supabase
      .from('reports')
      .select('id, title, category, status, address, location, created_at')
      .not('status', 'in', '("closed","resolved","completed")')
      .order('created_at', { ascending: false })
      .limit(300)

    if (error) {
      console.error('[MapPage] Supabase query failed:', error.code, error.message)
      queryError = error.message
      mapReports = []
    } else {
      // In-memory filter as guarantee against closed / resolved / completed reports
      mapReports = (reports ?? []).filter((r) => isMapActiveReport(r.status))
    }
  } catch (err: any) {
    console.error('[MapPage] Supabase query exception:', err)
    queryError = err?.message ?? 'Failed to query database'
    mapReports = []
  }

  const pendingCount = mapReports.filter((r) => (r.status || '').toLowerCase() === 'pending').length
  const inProgressCount = mapReports.filter((r) => ['in_progress', 'acknowledged'].includes((r.status || '').toLowerCase())).length

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

      {queryError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-semibold text-red-800">
          ⚠️ Unable to load live map reports: {queryError}. Check Supabase connection and RLS policies.
        </div>
      )}

      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Community Map</h1>
          <p className="text-gray-500 text-sm mt-1">
            Displaying <strong className="text-gray-800">{mapReports.length}</strong> active civic issue(s) ({pendingCount} pending, {inProgressCount} in progress). Closed and resolved cases are excluded.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-xl text-xs font-medium text-amber-800 self-start sm:self-auto">
          <span>Active Issues Only (Excludes Closed &amp; Resolved)</span>
        </div>
      </div>

      <MapView reports={mapReports as any} />

      {/* Color Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-gray-600 bg-white p-3 rounded-xl border border-gray-200">
        {[
          { color: '#ef4444', label: '🚨 Emergency' },
          { color: '#f97316', label: '⚡ Electrical' },
          { color: '#3b82f6', label: '💧 Water Leak' },
          { color: '#4b5563', label: '🛣️ Road Damage' },
          { color: '#22c55e', label: '🗑️ Garbage' },
          { color: '#a855f7', label: '🎨 Graffiti' },
          { color: '#eab308', label: '📢 Noise' },
          { color: '#6b7280', label: '📋 Other' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
