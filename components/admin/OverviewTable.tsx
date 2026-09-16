'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Report } from '@/lib/types'
import StatusBadge from '@/components/shared/StatusBadge'
import { formatDistanceToNow } from '@/lib/utils/date'
import { Search, ChevronRight, ArrowUpDown } from 'lucide-react'

const EMOJI: Record<string, string> = {
  road_damage: '🛣️', water_leak: '💧', electrical: '⚡',
  garbage: '🗑️', graffiti: '🎨', noise: '📢', emergency: '🚨', other: '📋',
}
type SortKey = 'created_at' | 'priority_score'

export default function OverviewTable({
  reports,
  initialStatus = '',
}: {
  reports: (Report & { departments?: { name: string } })[]
  initialStatus?: string
}) {
  const searchParams = useSearchParams()
  const statusFromUrl = searchParams ? (searchParams.get('status') ?? '') : initialStatus

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(statusFromUrl)
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const router = useRouter()

  useEffect(() => {
    if (searchParams) {
      setStatusFilter(searchParams.get('status') ?? '')
    }
  }, [searchParams])

  const filtered = useMemo(() => {
    let r = reports
    if (search) {
      const s = search.toLowerCase()
      r = r.filter((x) => x.title.toLowerCase().includes(s) || x.address?.toLowerCase().includes(s) || x.category.includes(s))
    }
    if (statusFilter) {
      if (statusFilter === 'resolved') {
        r = r.filter((x) => x.status === 'resolved' || x.status === 'closed')
      } else {
        r = r.filter((x) => x.status === statusFilter)
      }
    }
    return [...r].sort((a, b) => {
      const av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
      return (av < bv ? -1 : av > bv ? 1 : 0) * (sortDir === 'asc' ? 1 : -1)
    })
  }, [reports, search, statusFilter, sortKey, sortDir])

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('desc') }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by title, address, category…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none">
          <option value="">All Statuses</option>
          {['pending','acknowledged','in_progress','resolved','closed','reopened'].map(s => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      <p className="text-sm text-gray-500">{filtered.length} reports</p>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Issue</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Department</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell cursor-pointer select-none"
                  onClick={() => toggleSort('priority_score')}>
                  <span className="flex items-center gap-1">Priority <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell cursor-pointer select-none"
                  onClick={() => toggleSort('created_at')}>
                  <span className="flex items-center gap-1">Submitted <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((r) => (
                <tr key={r.id} onClick={() => router.push(`/reports/${r.id}`)}
                  className="hover:bg-purple-50/30 cursor-pointer transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{EMOJI[r.category] ?? '📋'}</span>
                      <div>
                        <p className="font-medium text-gray-900 text-sm line-clamp-1">{r.title}</p>
                        <p className="text-xs text-gray-400 line-clamp-1">{r.address}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 hidden lg:table-cell text-sm text-gray-600">{r.departments?.name ?? '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-sm text-gray-600">{Math.round(r.priority_score)}</td>
                  <td className="px-4 py-3 hidden xl:table-cell text-xs text-gray-400" suppressHydrationWarning>
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-gray-400" /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">No reports match your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
