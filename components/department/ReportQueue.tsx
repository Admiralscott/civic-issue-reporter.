'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Report } from '@/lib/types'
import StatusBadge from '@/components/shared/StatusBadge'
import { formatDistanceToNow } from '@/lib/utils/date'
import { Filter, ChevronRight, TrendingUp, Building2 } from 'lucide-react'
import { CATEGORY_EMOJI, formatSnakeCase } from '@/lib/utils/constants'

const FILTERS = ['all', 'pending', 'acknowledged', 'in_progress', 'resolved'] as const

export default function ReportQueue({
  reports: initialReports,
  userDeptId,
  userDeptName,
}: {
  reports: (Report & { departments?: { name: string } | null })[]
  userDeptId?: string | null
  userDeptName?: string | null
}) {
  const [reports, setReports] = useState<(Report & { departments?: { name: string } | null })[]>(initialReports)
  const [scope, setScope] = useState<'my' | 'all'>(userDeptId ? 'my' : 'all')
  const [filter, setFilter] = useState<typeof FILTERS[number]>('all')
  const router = useRouter()

  useEffect(() => {
    setReports(initialReports)
  }, [initialReports])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('realtime_reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, (payload) => {
        setReports((current) => {
          if (payload.eventType === 'INSERT') {
            const next = payload.new as (Report & { departments?: { name: string } | null })
            return current.some((r) => r.id === next.id) ? current : [next, ...current]
          }
          if (payload.eventType === 'UPDATE') {
            const next = payload.new as (Report & { departments?: { name: string } | null })
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

  const scopedReports = useMemo(() => {
    if (scope === 'my' && userDeptId) {
      return reports.filter((r) => r.assigned_dept_id === userDeptId)
    }
    return reports
  }, [reports, scope, userDeptId])

  const filtered = useMemo(() => {
    if (filter === 'all') return scopedReports
    if (filter === 'resolved') {
      return scopedReports.filter((r) => r.status === 'resolved' || r.status === 'closed')
    }
    return scopedReports.filter((r) => r.status === filter)
  }, [scopedReports, filter])

  const stats = [
    { label: 'Total', value: scopedReports.length, cls: 'bg-gray-50 text-gray-800 border border-gray-200' },
    { label: 'Pending', value: scopedReports.filter(r => r.status === 'pending').length, cls: 'bg-amber-50 text-amber-800 border border-amber-200' },
    { label: 'Acknowledged', value: scopedReports.filter(r => r.status === 'acknowledged').length, cls: 'bg-blue-50 text-blue-800 border border-blue-200' },
    { label: 'In Progress', value: scopedReports.filter(r => r.status === 'in_progress').length, cls: 'bg-purple-50 text-purple-800 border border-purple-200' },
    { label: 'Resolved / Closed', value: scopedReports.filter(r => r.status === 'resolved' || r.status === 'closed').length, cls: 'bg-emerald-50 text-emerald-800 border border-emerald-200' },
  ]

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {stats.map(({ label, value, cls }) => (
          <div key={label} className={`${cls} rounded-xl p-3 text-center shadow-2xs`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs mt-0.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Scope Toggles (for Department Staff) */}
      {userDeptId && (
        <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
          <button
            type="button"
            onClick={() => setScope('my')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              scope === 'my'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{userDeptName} Queue ({reports.filter((r) => r.assigned_dept_id === userDeptId).length})</span>
          </button>
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              scope === 'all'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            All City Issues ({reports.length})
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        {FILTERS.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize flex-shrink-0 transition ${
              filter === s ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {s === 'all' ? `All (${scopedReports.length})` : s === 'resolved' ? 'Resolved & Closed' : formatSnakeCase(s)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No reports match this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  {['Issue', 'Status', 'Priority', 'Submitted', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide
                      first:table-cell [&:nth-child(2)]:table-cell [&:nth-child(3)]:hidden [&:nth-child(3)]:md:table-cell [&:nth-child(4)]:hidden [&:nth-child(4)]:lg:table-cell last:table-cell">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((report) => (
                  <tr key={report.id}
                    onClick={() => { router.push(`/reports/${report.id}`) }}
                    className="hover:bg-orange-50/80 cursor-pointer transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{CATEGORY_EMOJI[report.category] ?? '📋'}</span>
                        <div>
                          <p className="font-medium text-gray-900 text-sm line-clamp-1 hover:text-orange-600">
                            {report.title}
                          </p>
                          <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{report.address}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={report.status} /></td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <TrendingUp className="w-3 h-3" />{Math.round(report.priority_score)}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400" suppressHydrationWarning>
                      {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="p-2 inline-flex items-center justify-center bg-orange-50 rounded-lg group-hover:bg-orange-200 transition">
                        <ChevronRight className="w-5 h-5 text-orange-600" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
