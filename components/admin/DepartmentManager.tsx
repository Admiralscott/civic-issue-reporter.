'use client'

import { useState } from 'react'
import type { Department, Report, StatusHistory } from '@/lib/types'
import StatusBadge from '@/components/shared/StatusBadge'
import { formatDistanceToNow, format } from '@/lib/utils/date'
import { CATEGORY_EMOJI, formatSnakeCase } from '@/lib/utils/constants'
import { getDepartmentTheme } from '@/lib/utils/department-helpers'
import {
  Building2,
  ChevronRight,
  FileText,
  Clock,
  MapPin,
  TrendingUp,
  CheckCircle2,
  Tag,
  Mail,
  User,
} from 'lucide-react'

export type DepartmentWithReports = Department & {
  reports: Array<
    Report & {
      status_history?: Array<
        StatusHistory & {
          users?: { full_name: string | null }
        }
      >
    }
  >
}

export default function DepartmentManager({
  departments,
}: {
  departments: DepartmentWithReports[]
}) {
  const [expandedDeptId, setExpandedDeptId] = useState<string | null>(
    departments[0]?.id ?? null
  )
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null)

  const toggleDept = (id: string) => {
    setExpandedDeptId((prev) => (prev === id ? null : id))
  }

  const toggleReport = (id: string) => {
    setExpandedReportId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Department Oversight & Reports</h1>
          <p className="text-gray-500 text-sm mt-1">
            View assigned reports, field activity logs, and status timelines across all municipal departments.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {departments.map((dept) => {
          const isDeptExpanded = expandedDeptId === dept.id
          const reports = dept.reports ?? []
          const pendingCount = reports.filter((r) => r.status === 'pending').length
          const inProgressCount = reports.filter(
            (r) => r.status === 'in_progress' || r.status === 'acknowledged'
          ).length
          const resolvedCount = reports.filter(
            (r) => r.status === 'resolved' || r.status === 'closed'
          ).length
          const theme = getDepartmentTheme(dept.name || dept.id)

          return (
            <div
              key={dept.id}
              style={theme.cardStyle}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm transition"
            >
              {/* Department Header */}
              <div
                onClick={() => toggleDept(dept.id)}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/70 transition border-b border-gray-100"
              >
                <div className="flex items-start gap-3">
                  <div
                    style={theme.iconStyle}
                    className="p-3 rounded-xl mt-0.5 shadow-xs flex items-center justify-center"
                  >
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900">{dept.name}</h2>
                      {dept.zone && (
                        <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full">
                          {dept.zone}
                        </span>
                      )}
                    </div>
                    {dept.description && (
                      <p className="text-xs text-gray-500 mt-1">{dept.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {dept.categories?.map((cat) => (
                        <span
                          key={cat}
                          style={theme.tagStyle}
                          className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {formatSnakeCase(cat)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right side stats + accordion toggle */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="px-2.5 py-1 bg-yellow-50 text-yellow-700 rounded-lg font-semibold border border-yellow-200">
                      {pendingCount} Pending
                    </div>
                    <div className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-semibold border border-blue-200">
                      {inProgressCount} Active
                    </div>
                    <div className="px-2.5 py-1 bg-green-50 text-green-700 rounded-lg font-semibold border border-green-200">
                      {resolvedCount} Fixed
                    </div>
                  </div>
                  <div className="p-2 text-gray-400 rounded-lg">
                    <ChevronRight className={`w-5 h-5 transition-transform duration-200 ${isDeptExpanded ? 'rotate-90 text-gray-700' : 'text-gray-400'}`} />
                  </div>
                </div>
              </div>

              {/* Department Body: Reports & Activity Log */}
              {isDeptExpanded && (
                <div className="p-5 bg-gray-50/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-gray-600" />
                      Assigned Reports ({reports.length})
                    </h3>
                    {dept.email && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {dept.email}
                      </span>
                    )}
                  </div>

                  {reports.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-xl border border-dashed border-gray-300">
                      No reports currently assigned to this department.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reports.map((report) => {
                        const isReportExpanded = expandedReportId === report.id
                        const history = report.status_history ?? []

                        return (
                          <div
                            key={report.id}
                            className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs hover:border-gray-300 transition"
                          >
                            {/* Report Header Row */}
                            <div
                              onClick={() => toggleReport(report.id)}
                              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-gray-50/70"
                            >
                              <div className="flex items-start gap-3">
                                <span className="text-xl mt-0.5 flex-shrink-0">
                                  {CATEGORY_EMOJI[report.category] ?? '📋'}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-gray-900 text-sm">{report.title}</h4>
                                    <StatusBadge status={report.status} />
                                  </div>
                                  {report.address && (
                                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                      <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                      {report.address}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-4 text-xs text-gray-400">
                                <div className="flex items-center gap-1 text-gray-600">
                                  <TrendingUp className="w-3 h-3 text-gray-500" />
                                  Score: {Math.round(report.priority_score)}
                                </div>
                                <span suppressHydrationWarning>
                                  {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                                </span>
                                <div className="p-1 text-gray-400">
                                  <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isReportExpanded ? 'rotate-90 text-gray-700' : 'text-gray-400'}`} />
                                </div>
                              </div>
                            </div>

                            {/* Report Detail & Activity Log (Accordion) */}
                            {isReportExpanded && (
                              <div className="p-4 bg-gray-50/60 border-t border-gray-100 space-y-4">
                                {report.description && (
                                  <p className="text-xs text-gray-700 bg-white p-3 rounded-lg border border-gray-200">
                                    <strong>Description:</strong> {report.description}
                                  </p>
                                )}

                                {/* Photos */}
                                {report.photo_urls && report.photo_urls.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-500 mb-1.5">Submitted Photos:</p>
                                    <div className="flex gap-2">
                                      {report.photo_urls.map((url, i) => (
                                        <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Resolution Proof Photo */}
                                {report.resolution_photo_url && (
                                  <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                                    <p className="text-xs font-bold text-green-800 flex items-center gap-1.5 mb-2">
                                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                                      Department Proof of Resolution:
                                    </p>
                                    <img
                                      src={report.resolution_photo_url}
                                      alt="Proof"
                                      className="w-full max-w-xs h-32 object-cover rounded-lg border border-green-300"
                                    />
                                  </div>
                                )}

                                {/* Activity Log Timeline */}
                                <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                                  <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-gray-600" />
                                    Department Activity Log ({history.length} events)
                                  </h5>

                                  {history.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic">No field activity logged yet.</p>
                                  ) : (
                                    <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                                      {history.map((entry) => (
                                        <div key={entry.id} className="flex items-start gap-3 relative pl-6">
                                          <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-gray-600 text-white flex items-center justify-center text-[9px] font-bold">
                                            ✓
                                          </div>
                                          <div className="flex-1 bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-xs">
                                            <div className="flex items-center justify-between font-semibold text-gray-800">
                                              <span>
                                                Status changed to{' '}
                                                <span className="text-gray-900 font-bold capitalize">
                                                  {formatSnakeCase(entry.new_status)}
                                                </span>
                                              </span>
                                              <span className="text-[10px] text-gray-400 font-mono" suppressHydrationWarning>
                                                {format(new Date(entry.created_at), 'MMM d, yyyy · h:mm a')}
                                              </span>
                                            </div>
                                            {entry.users?.full_name && (
                                              <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                                <User className="w-3 h-3 text-gray-400" /> Action by: {entry.users.full_name}
                                              </p>
                                            )}
                                            {entry.note && (
                                              <p className="text-xs text-gray-600 mt-1 italic bg-white p-1.5 rounded border border-gray-200">
                                                "{entry.note}"
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
