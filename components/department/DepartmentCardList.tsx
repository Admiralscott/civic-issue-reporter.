'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Department, Report } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { formatSnakeCase } from '@/lib/utils/constants'
import {
  isReportInDepartment,
  calculateDepartmentStats,
  CONFIGURED_DEPARTMENTS,
} from '@/lib/utils/department-helpers'
import {
  Building2,
  ChevronRight,
  Tag,
  RefreshCw,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react'

interface Props {
  initialDepartments: Department[]
  initialReports: (Report & { departments?: { name: string } | null })[]
  userDeptName?: string
}

export default function DepartmentCardList({
  initialDepartments,
  initialReports,
  userDeptName,
}: Props) {
  const router = useRouter()
  const [departments, setDepartments] = useState<Department[]>(
    initialDepartments.length > 0 ? initialDepartments : CONFIGURED_DEPARTMENTS
  )
  const [reports, setReports] = useState<(Report & { departments?: { name: string } | null })[]>(
    initialReports
  )
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Realtime subscription for live reports and status updates
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('department_portal_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        async () => {
          try {
            const { data } = await supabase
              .from('reports')
              .select('*, departments(name)')
              .order('priority_score', { ascending: false })

            if (data && data.length > 0) {
              setReports(data)
            }
          } catch {
            // Keep existing state on transient fetch error
          }
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'departments' },
        async () => {
          try {
            const { data } = await supabase.from('departments').select('*').order('name')
            if (data && data.length > 0) {
              setDepartments(data)
            }
          } catch {}
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  // Manual refresh handler
  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true)
    setError(null)
    try {
      const supabase = createClient()
      const [deptRes, repRes] = await Promise.all([
        supabase.from('departments').select('*').order('name'),
        supabase.from('reports').select('*, departments(name)').order('priority_score', { ascending: false }),
      ])

      if (deptRes.data && deptRes.data.length > 0) {
        setDepartments(deptRes.data)
      }
      if (repRes.data && repRes.data.length > 0) {
        setReports(repRes.data)
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to refresh department data.')
    } finally {
      setIsRefreshing(false)
      router.refresh()
    }
  }, [router])

  // Identify unassigned reports (reports not belonging to any of the 4 configured departments)
  const unassignedReports = useMemo(() => {
    return reports.filter((r) => {
      return !departments.some((dept) => isReportInDepartment(r, dept))
    })
  }, [reports, departments])

  const unassignedStats = useMemo(() => {
    return {
      pending: unassignedReports.filter((r) => r.status === 'pending').length,
      active: unassignedReports.filter(
        (r) => r.status === 'in_progress' || r.status === 'acknowledged' || r.status === 'reopened'
      ).length,
      fixed: unassignedReports.filter((r) => r.status === 'resolved' || r.status === 'closed').length,
      total: unassignedReports.length,
    }
  }, [unassignedReports])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Department Portals
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Select a municipal department below to manage active queues, inspect issue records, and update resolution statuses.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Live indicator badge */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Realtime Live</span>
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            title="Refresh department cards"
            className="p-2 text-gray-500 bg-white hover:text-gray-900 hover:bg-gray-100 rounded-xl border border-gray-200 transition shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-orange-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="font-bold underline hover:text-red-900 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {departments.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center shadow-xs">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800">No Departments Available</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            No municipal department records could be loaded from the database.
          </p>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-semibold hover:bg-orange-700 transition"
          >
            Reload Departments
          </button>
        </div>
      )}

      {/* Four Department Cards - Vertically Stacked */}
      <div className="space-y-4">
        {departments.map((dept) => {
          const stats = calculateDepartmentStats(dept, reports)

          return (
            <div
              key={dept.id}
              onClick={() => router.push(`/queue/${dept.id}`)}
              className="group bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md hover:border-purple-300 transition duration-150 cursor-pointer"
            >
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Left side: Icon, Department Name, Zone, Description, Categories */}
                <div className="flex items-start gap-3.5">
                  <div className="p-3 bg-purple-100 text-purple-700 rounded-xl mt-0.5 group-hover:bg-purple-200 transition">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900 group-hover:text-purple-900 transition">
                        {dept.name}
                      </h2>
                      {dept.zone && (
                        <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full capitalize">
                          {dept.zone}
                        </span>
                      )}
                    </div>
                    {dept.description && (
                      <p className="text-xs text-gray-500 mt-1">{dept.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {dept.categories?.map((cat) => (
                        <span
                          key={cat}
                          className="inline-flex items-center gap-1 text-[11px] font-medium bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-md border border-purple-200/60"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {formatSnakeCase(cat)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right side: Pending, Active, Fixed counters and right chevron */}
                <div className="flex items-center gap-4 self-end sm:self-center">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="px-2.5 py-1 bg-yellow-50 text-yellow-700 rounded-lg font-semibold border border-yellow-200 shadow-2xs">
                      {stats.pending} Pending
                    </div>
                    <div className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-semibold border border-blue-200 shadow-2xs">
                      {stats.active} Active
                    </div>
                    <div className="px-2.5 py-1 bg-green-50 text-green-700 rounded-lg font-semibold border border-green-200 shadow-2xs">
                      {stats.fixed} Fixed
                    </div>
                  </div>
                  <div className="p-2 text-gray-400 group-hover:text-purple-600 rounded-lg transition">
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {/* Unassigned Issues Handling (Ensures no issues are silently lost) */}
        {unassignedReports.length > 0 && (
          <div
            onClick={() => router.push('/queue/unassigned')}
            className="group bg-amber-50/60 rounded-2xl border border-dashed border-amber-300 overflow-hidden shadow-xs hover:shadow-sm hover:border-amber-400 transition duration-150 cursor-pointer mt-6"
          >
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-amber-100 text-amber-800 rounded-xl mt-0.5 group-hover:bg-amber-200 transition">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-amber-950">
                      Unassigned Reports
                    </h2>
                    <span className="text-[11px] font-bold bg-amber-200/80 text-amber-900 px-2.5 py-0.5 rounded-full">
                      Triage Needed
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 mt-1">
                    Issues pending department categorization or awaiting routing assignment.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-center">
                <div className="flex items-center gap-2 text-xs">
                  <div className="px-2.5 py-1 bg-yellow-100/90 text-yellow-800 rounded-lg font-semibold border border-yellow-300 shadow-2xs">
                    {unassignedStats.pending} Pending
                  </div>
                  <div className="px-2.5 py-1 bg-blue-100/90 text-blue-800 rounded-lg font-semibold border border-blue-300 shadow-2xs">
                    {unassignedStats.active} Active
                  </div>
                  <div className="px-2.5 py-1 bg-green-100/90 text-green-800 rounded-lg font-semibold border border-green-300 shadow-2xs">
                    {unassignedStats.fixed} Fixed
                  </div>
                </div>
                <div className="p-2 text-amber-600 rounded-lg">
                  <ChevronRight className="w-5 h-5 text-amber-700 group-hover:translate-x-0.5 transition" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
