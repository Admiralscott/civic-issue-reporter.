'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from '@/lib/utils/date'
import {
  Building2,
  Users,
  CheckCircle2,
  TrendingUp,
  ChevronRight,
  X,
  MapPin,
} from 'lucide-react'
import {
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'

const EMOJI: Record<string, string> = {
  road_damage: '🛣️', water_leak: '💧', electrical: '⚡',
  garbage: '🗑️', graffiti: '🎨', noise: '📢', emergency: '🚨', other: '📋',
}

interface GovDashboardProps {
  metrics: {
    totalReports: number
    totalCitizens: number
    resolvedToday: number
    activeDepartments: number
    resolutionRate: number
    slaOnTimeRate: number
    avgResolutionHours: number
  }
  activityData: Array<{ time: string; count: number }>
  progressBars: Array<{ label: string; current: number; total: number; color: string }>
  resolvedReports?: any[]
}

export default function GovDashboardTemplate({
  metrics,
  activityData,
  progressBars,
  resolvedReports = [],
}: GovDashboardProps) {
  const [showResolvedModal, setShowResolvedModal] = useState(false)

  return (
    <div className="space-y-6 font-sans">
      {/* Sub-header Breadcrumb Bar */}
      <div className="flex items-center justify-between bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm text-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-gray-800">Dashboard</span>
          <span className="text-gray-400 font-light text-xs">Biometric & Civic Issue Management System</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
          <Building2 className="w-3.5 h-3.5" /> Dashboard
        </div>
      </div>

      {/* Top 4 Solid Colored Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Bright Blue - Total Reports */}
        <div className="bg-[#3498db] rounded-lg text-white shadow-md overflow-hidden flex flex-col justify-between relative">
          <div className="p-4 flex items-start justify-between">
            <div>
              <p className="text-4xl font-extrabold tracking-tight">{metrics.totalReports}</p>
              <p className="text-xs font-semibold uppercase tracking-wider mt-1 opacity-90">Total Issues Reported</p>
            </div>
            <Building2 className="w-14 h-14 opacity-20 absolute right-3 top-3" />
          </div>
          <Link
            href="/overview#city-issue-registry"
            onClick={() => {
              const el = document.getElementById('city-issue-registry')
              if (el) el.scrollIntoView({ behavior: 'smooth' })
            }}
            className="bg-black/15 hover:bg-black/25 px-4 py-2 text-xs font-medium flex items-center justify-center gap-1 transition text-white/90"
          >
            More info <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Card 2: Orange - Registered Citizens */}
        <div className="bg-[#ff851b] rounded-lg text-white shadow-md overflow-hidden flex flex-col justify-between relative">
          <div className="p-4 flex items-start justify-between">
            <div>
              <p className="text-4xl font-extrabold tracking-tight">{metrics.totalCitizens}</p>
              <p className="text-xs font-semibold uppercase tracking-wider mt-1 opacity-90">Registered Citizens</p>
            </div>
            <Users className="w-14 h-14 opacity-20 absolute right-3 top-3" />
          </div>
          <Link
            href="/departments"
            className="bg-black/15 hover:bg-black/25 px-4 py-2 text-xs font-medium flex items-center justify-center gap-1 transition text-white/90"
          >
            More info <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Card 3: Olive / Green - Resolved Issues */}
        <div className="bg-[#8bc34a] rounded-lg text-white shadow-md overflow-hidden flex flex-col justify-between relative">
          <div className="p-4 flex items-start justify-between">
            <div>
              <p className="text-4xl font-extrabold tracking-tight">{metrics.resolvedToday}</p>
              <p className="text-xs font-semibold uppercase tracking-wider mt-1 opacity-90">Resolved Issues</p>
            </div>
            <CheckCircle2 className="w-14 h-14 opacity-20 absolute right-3 top-3" />
          </div>
          <button
            type="button"
            onClick={() => setShowResolvedModal(true)}
            className="bg-black/15 hover:bg-black/25 px-4 py-2 text-xs font-medium flex items-center justify-center gap-1 transition text-white/90 w-full cursor-pointer"
          >
            More info <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 4: Copper / Brown - Active Departments */}
        <div className="bg-[#d35400] rounded-lg text-white shadow-md overflow-hidden flex flex-col justify-between relative">
          <div className="p-4 flex items-start justify-between">
            <div>
              <p className="text-4xl font-extrabold tracking-tight">{metrics.activeDepartments}</p>
              <p className="text-xs font-semibold uppercase tracking-wider mt-1 opacity-90">Active Departments</p>
            </div>
            <Building2 className="w-14 h-14 opacity-20 absolute right-3 top-3" />
          </div>
          <Link
            href="/departments"
            className="bg-black/15 hover:bg-black/25 px-4 py-2 text-xs font-medium flex items-center justify-center gap-1 transition text-white/90"
          >
            More info <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Main Charts & Breakdown Section (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Issue Activity Chart */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-md p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
            <div className="flex items-center gap-2 text-gray-700 font-bold text-sm">
              <TrendingUp className="w-4 h-4 text-blue-600" /> Issue Activity Trend
            </div>
            <div className="bg-[#00c0ef] text-white p-1 rounded cursor-pointer hover:bg-blue-600">
              <span className="block w-3.5 h-3.5 leading-none text-center font-bold text-xs">-</span>
            </div>
          </div>

          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3498db" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3498db" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#3498db"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#blueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-gray-400 text-right mt-2 font-mono">CivicTrack.gov.in Realtime Analytics</p>
        </div>

        {/* Right Card: Resolution & Breakdown Meters */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-md p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
            <div className="flex items-center gap-2 text-gray-700 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600" /> Resolution & System Metrics
            </div>
            <div className="bg-[#00a65a] text-white p-1 rounded cursor-pointer hover:bg-green-600">
              <span className="block w-3.5 h-3.5 leading-none text-center font-bold text-xs">-</span>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="space-y-4 mb-6">
            {progressBars.map((bar, idx) => {
              const pct = Math.min(100, Math.round((bar.current / (bar.total || 1)) * 100))
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-gray-600">
                    <span>{bar.label}</span>
                    <span className="font-mono text-gray-400">{bar.current}/{bar.total}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: bar.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Bottom Circular Gauges */}
          <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-4 text-center">
            {/* Meter 1 */}
            <div>
              <div className="w-14 h-14 mx-auto rounded-full border-4 border-[#8bc34a] flex items-center justify-center font-extrabold text-xs text-gray-800 shadow-inner">
                {metrics.resolutionRate}%
              </div>
              <p className="text-[11px] font-semibold text-gray-600 mt-1">Resolution Rate</p>
            </div>

            {/* Meter 2 */}
            <div>
              <div className="w-14 h-14 mx-auto rounded-full border-4 border-[#ff851b] flex items-center justify-center font-extrabold text-xs text-gray-800 shadow-inner">
                {metrics.slaOnTimeRate}%
              </div>
              <p className="text-[11px] font-semibold text-gray-600 mt-1">SLA On-Time Rate</p>
            </div>

            {/* Meter 3 */}
            <div>
              <p className="text-xl font-extrabold text-[#3498db] mt-2">{metrics.avgResolutionHours} <span className="text-xs text-gray-500">hrs</span></p>
              <p className="text-[11px] font-semibold text-gray-600 mt-1">Avg Response Time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Resolved Issues Modal Window */}
      {showResolvedModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-green-700 text-white flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Resolved Issue Reports</h3>
                  <p className="text-xs text-green-100">
                    Displaying {resolvedReports.length} officially resolved & closed reports
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResolvedModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Reports List */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1 bg-gray-50/50">
              {resolvedReports.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
                  <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="font-semibold text-gray-700">No resolved issues recorded yet</p>
                  <p className="text-xs text-gray-400 mt-1">Issues will appear here once marked as resolved by department staff.</p>
                </div>
              ) : (
                resolvedReports.map((r: any) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl border border-gray-200 bg-white hover:border-green-300 hover:shadow-md transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-2xl p-2.5 bg-green-50 rounded-xl border border-green-100 shrink-0">
                        {EMOJI[r.category] ?? '📋'}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-gray-900 text-sm">{r.title}</h4>
                          <span className="bg-green-100 text-green-800 text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-green-200">
                            <CheckCircle2 className="w-3 h-3 text-green-600" /> Resolved
                          </span>
                        </div>
                        {r.address && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" /> {r.address}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-[11px] text-gray-400 pt-1">
                          {r.departments?.name && (
                            <span className="font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                              {r.departments.name}
                            </span>
                          )}
                          <span suppressHydrationWarning>
                            Reported {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/reports/${r.id}`}
                      className="px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 self-end sm:self-center shadow-xs"
                    >
                      View Report <span className="text-xs">?</span>
                    </Link>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-white border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">
                CivicTrack Executive Resolution Archive
              </span>
              <button
                type="button"
                onClick={() => setShowResolvedModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
