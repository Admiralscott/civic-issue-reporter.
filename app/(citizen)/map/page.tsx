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

export default async function MapPage() {
  const supabase = createClient()

  // Select ALL reports without excluding NULL locations so all reports are mapped
  const { data: reports } = await supabase
    .from('reports')
    .select('id, title, category, status, address, location, created_at')
    .order('created_at', { ascending: false })
    .limit(300)

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

      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Community Map</h1>
        <p className="text-gray-500 text-sm mt-1">
          {reports?.length ?? 0} active report(s) plotted on the map
        </p>
      </div>

      <MapView reports={(reports ?? []) as any} />

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
