import type { Report } from '@/lib/types'
import StatusBadge from '@/components/shared/StatusBadge'
import { formatDistanceToNow } from '@/lib/utils/date'
import { MapPin, ThumbsUp, Calendar, CheckCircle2 } from 'lucide-react'

const CATEGORY_EMOJI: Record<string, string> = {
  road_damage: '🛣️', water_leak: '💧', electrical: '⚡',
  garbage: '🗑️', graffiti: '🎨', noise: '📢', emergency: '🚨', other: '📋',
}

export default function ReportCard({ report }: { report: Report }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition overflow-hidden">
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0 mt-0.5">
          {CATEGORY_EMOJI[report.category] ?? '📋'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-gray-900 line-clamp-1">{report.title}</h3>
            <StatusBadge status={report.status} className="flex-shrink-0" />
          </div>
          {report.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{report.description}</p>
          )}
          {report.address && (
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{report.address}</span>
            </div>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <div className="flex items-center gap-1" suppressHydrationWarning>
              <Calendar className="w-3 h-3" />
              {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
            </div>
            <div className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" />
              {report.upvote_count}
            </div>
          </div>
        </div>
      </div>

      {/* Citizen Uploaded Issue Photos */}
      {report.photo_urls && report.photo_urls.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-1.5 font-medium">Issue Photos:</p>
          <div className="flex gap-2">
            {report.photo_urls.slice(0, 3).map((url, i) => (
              <img key={i} src={url} alt={`Issue Photo ${i + 1}`} className="w-16 h-16 object-cover rounded-xl border border-gray-200" />
            ))}
          </div>
        </div>
      )}

      {/* Proof of Resolution Banner & Photo */}
      {report.resolution_photo_url && (
        <div className="mt-3 pt-3 border-t border-green-200 bg-green-50/80 -mx-4 -mb-4 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-green-800 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            Proof of Resolution (Department Verified)
          </div>
          <img
            src={report.resolution_photo_url}
            alt="Proof of Resolution"
            className="w-full h-44 object-cover rounded-xl border border-green-300 shadow-sm"
          />
        </div>
      )}
    </div>
  )
}
