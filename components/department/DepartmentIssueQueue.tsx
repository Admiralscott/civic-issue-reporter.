'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Department, Report } from '@/lib/types'
import StatusBadge from '@/components/shared/StatusBadge'
import { formatDistanceToNow } from '@/lib/utils/date'
import { CATEGORY_EMOJI, formatSnakeCase } from '@/lib/utils/constants'
import { isReportInDepartment, getDepartmentTheme } from '@/lib/utils/department-helpers'
import {
  Building2,
  ChevronRight,
  TrendingUp,
  Filter,
  ArrowLeft,
  Tag,
  Mail,
  Search,
  Inbox,
  HelpCircle,
} from 'lucide-react'

const FILTERS = ['all', 'pending', 'acknowledged', 'in_progress', 'resolved'] as const

interface Props {
  department: Department | null
  initialReports: (Report & { departments?: { name: string } | null })[]
  isUnassigned?: boolean
}

export default function DepartmentIssueQueue({
  department,
  initialReports,
  isUnassigned = false,
}: Props) {
  const router = useRouter()
  const [reports, setReports] = useState<(Report & { departments?: { name: string } | null })[]>(
    initialReports
  )
  const [filter, setFilter] = useState<typeof FILTERS[number]>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [realtimeConnected, setRealtimeConnected] = useState(false)

  // Realtime subscription — refetch all reports on any change to the reports table.
  // FIX: always apply setReports(data) when data is non-null, even if the array is empty.
  //       Previously `if (data && data.length > 0)` would preserve stale state on valid empty results.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('department_issues_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        async () => {
          try {
            const { data, error } = await supabase
              .from('reports')
              .select('*, departments(name)')
              .order('priority_score', { ascending: false })

            if (error) {
              // Log the real error — do not silently swallow it.
              console.error('[DepartmentIssueQueue] Realtime refetch error:', error.code, error.message)
              return
            }
            // Apply even if data is an empty array — that is a valid state.
            if (data !== null) {
              setReports(data)
            }
          } catch (err) {
            console.error('[DepartmentIssueQueue] Realtime refetch exception:', err)
          }
          router.refresh()
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED')
        if (process.env.NODE_ENV === 'development') {
          console.info('[DepartmentIssueQueue] Realtime channel status:', status)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  // Filter reports specifically for this department
  const deptReports = useMemo(() => {
    if (isUnassigned) {
      return reports.filter((r) => !r.assigned_dept_id)
    }
    if (!department) return reports
    return reports.filter((r) => isReportInDepartment(r, department))
  }, [reports, department, isUnassigned])

  // Apply status and search query filters
  const filteredReports = useMemo(() => {
    return deptReports.filter((r) => {
      // Status filter
      if (filter === 'resolved') {
        if (r.status !== 'resolved' && r.status !== 'closed') return false
      } else if (filter !== 'all') {
        if (r.status !== filter) return false
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const titleMatch = r.title.toLowerCase().includes(q)
        const addrMatch = r.address?.toLowerCase().includes(q) ?? false
        const catMatch = r.category.toLowerCase().includes(q)
        if (!titleMatch && !addrMatch && !catMatch) return false
      }

      return true
    })
  }, [deptReports, filter, searchQuery])

  // Stats for this department
  const stats = [
    { label: 'Total', value: deptReports.length, cls: 'bg-gray-50 text-gray-800 border-gray-200' },
    {
      label: 'Pending',
      value: deptReports.filter((r) => r.status === 'pending').length,
      cls: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    {
      label: 'Acknowledged',
      value: deptReports.filter((r) => r.status === 'acknowledged').length,
      cls: 'bg-blue-50 text-blue-800 border-blue-200',
    },
    {
      label: 'In Progress',
      value: deptReports.filter((r) => r.status === 'in_progress').length,
      cls: 'bg-purple-50 text-purple-800 border-purple-200',
    },
    {
      label: 'Resolved / Closed',
      value: deptReports.filter((r) => r.status === 'resolved' || r.status === 'closed').length,
      cls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
  ]

  const deptTheme = getDepartmentTheme(department?.name || department?.id)

  return (
    <div className="space-y-6">
      {/* Back button and navigation breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/queue"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition shadow-2xs group"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-gray-500 group-hover:-translate-x-0.5 transition" />
          <span>Back to All Departments</span>
        </Link>

        <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border shadow-2xs ${
          realtimeConnected
            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
            : 'text-gray-500 bg-gray-50 border-gray-200'
        }`}>
          <span className={`w-2 h-2 rounded-full ${realtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
          <span>{realtimeConnected ? 'Realtime Live' : 'Connecting…'}</span>
        </div>
      </div>

      {/* Department Banner / Header */}
      <div
        style={isUnassigned ? { borderLeft: '6px solid #f59e0b' } : deptTheme.cardStyle}
        className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              style={isUnassigned ? { backgroundColor: '#fef3c7', color: '#92400e' } : deptTheme.iconStyle}
              className="p-3.5 rounded-2xl shadow-xs flex items-center justify-center"
            >
              {isUnassigned ? (
                <HelpCircle className="w-7 h-7 text-amber-800" />
              ) : (
                <Building2 className="w-7 h-7 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">
                  {isUnassigned ? 'Unassigned Civic Reports' : department?.name}
                </h1>
                {department?.zone && (
                  <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full capitalize">
                    {department.zone}
                  </span>
                )}
                {isUnassigned && (
                  <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
                    Awaiting Assignment
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-500 mt-1">
                {isUnassigned
                  ? 'Civic reports submitted by citizens that require department routing or review.'
                  : department?.description}
              </p>

              {department?.categories && department.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {department.categories.map((cat) => (
                    <span
                      key={cat}
                      style={deptTheme.tagStyle}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-md border"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {formatSnakeCase(cat)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {department?.email && (
            <div className="text-xs text-gray-500 flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 self-start">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              <span>{department.email}</span>
            </div>
          )}
        </div>
      </div>

      {/* Status Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {stats.map(({ label, value, cls }) => (
          <div
            key={label}
            className={`${cls} rounded-2xl p-3.5 text-center shadow-2xs border`}
          >
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs mt-0.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize flex-shrink-0 transition cursor-pointer ${
                filter === s
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {s === 'all'
                ? `All (${deptReports.length})`
                : s === 'resolved'
                ? 'Resolved & Closed'
                : formatSnakeCase(s)}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search issues or address…"
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Issues Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {deptReports.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 mx-auto mb-3">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">
              No reports currently assigned to this department
            </h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Newly submitted citizen reports matching this department will appear here in realtime.
            </p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            No reports match the selected filter or search term.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  {['Issue', 'Status', 'Priority', 'Submitted', ''].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide first:table-cell [&:nth-child(2)]:table-cell [&:nth-child(3)]:hidden [&:nth-child(3)]:md:table-cell [&:nth-child(4)]:hidden [&:nth-child(4)]:lg:table-cell last:table-cell"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredReports.map((report) => (
                  <tr
                    key={report.id}
                    onClick={() => {
                      router.push(`/reports/${report.id}`)
                    }}
                    className="hover:bg-orange-50/70 cursor-pointer transition group"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="text-xl flex-shrink-0">
                          {CATEGORY_EMOJI[report.category] ?? '📋'}
                        </span>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm line-clamp-1 group-hover:text-orange-600 transition">
                            {report.title}
                          </p>
                          <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                            {report.address || 'Address not provided'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <StatusBadge status={report.status} />
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
                        <span className="font-semibold">
                          {Math.round(report.priority_score)}
                        </span>
                      </div>
                    </td>
                    <td
                      className="px-4 py-3.5 hidden lg:table-cell text-xs text-gray-400 whitespace-nowrap"
                      suppressHydrationWarning
                    >
                      {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="p-2 inline-flex items-center justify-center bg-gray-50 rounded-xl group-hover:bg-orange-100 transition">
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-orange-600 transition" />
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
