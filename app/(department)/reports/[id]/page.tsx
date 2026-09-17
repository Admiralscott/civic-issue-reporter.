import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StatusBadge from '@/components/shared/StatusBadge'
import StatusUpdateModal from '@/components/department/StatusUpdateModal'
import { formatDistanceToNow, format } from '@/lib/utils/date'
import type { Report, ReportStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ReportDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
    if (userData?.role === 'citizen') {
      redirect('/my-reports')
    }
  }

  const { data: report } = await supabase
    .from('reports')
    .select('*, departments(name)')
    .eq('id', params.id)
    .maybeSingle()

  if (!report) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-2xl border border-gray-200 text-center shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Report Not Found</h2>
        <p className="text-gray-500 text-sm mb-4">The requested report ID could not be loaded.</p>
        <a href="/queue" className="inline-block px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 transition">
          Return to Queue
        </a>
      </div>
    )
  }

  const { data: history } = await supabase
    .from('status_history')
    .select('id, new_status, note, created_at')
    .eq('report_id', params.id)
    .order('created_at', { ascending: false })

  const r = report as Report & { departments: { name: string } | null }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Back button */}
      <div>
        <a
          href="/queue"
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-xs"
        >
          ← Back to Queue
        </a>
      </div>

      {/* Report details */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{r.title}</h1>
            <p className="text-sm text-gray-500 capitalize mt-0.5">
              {r.category.replace('_', ' ')} · Priority {Math.round(r.priority_score)}
            </p>
          </div>
          <StatusBadge status={r.status} />
        </div>

        {r.description && <p className="text-gray-700 text-sm mb-4">{r.description}</p>}
        {r.address && <p className="text-sm text-gray-500 mb-4">📍 {r.address}</p>}

        {r.photo_urls && r.photo_urls.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            {r.photo_urls.map((url, i) => (
              <img key={i} src={url} alt={`Photo ${i + 1}`}
                className="w-24 h-24 object-cover rounded-xl border border-gray-200" />
            ))}
          </div>
        )}

        {(r as any).resolution_photo_url && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
              ✓ Verified Proof of Resolution Photo
            </p>
            <img src={(r as any).resolution_photo_url} alt="Proof of Resolution" className="w-32 h-32 object-cover rounded-lg border border-green-300 shadow-xs" />
          </div>
        )}

        <div className="text-xs text-gray-400 border-t border-gray-100 pt-4 flex flex-wrap gap-3">
          <span suppressHydrationWarning>Submitted {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
          {r.departments && <span>· {r.departments.name}</span>}
          <span>· {r.upvote_count} upvotes</span>
        </div>
      </div>

      {/* Status Update */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">Update Status</h2>
        <StatusUpdateModal reportId={r.id} currentStatus={r.status as ReportStatus} />
      </div>

      {/* History */}
      {history && history.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Activity Log</h2>
          <div className="space-y-4">
            {history.map((entry: any) => (
              <div key={entry.id} className="flex gap-3">
                <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-800">
                    Status → <span className="font-medium capitalize">{entry.new_status.replace('_', ' ')}</span>
                  </p>
                  {entry.note && <p className="text-xs text-gray-500 mt-0.5 italic">{entry.note}</p>}
                  <p className="text-xs text-gray-400 mt-0.5" suppressHydrationWarning>
                    {format(new Date(entry.created_at), 'MMM d, yyyy · h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
