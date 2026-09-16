'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts'

const STATUS_COLORS: Record<string, string> = {
  pending: '#eab308', acknowledged: '#3b82f6', in_progress: '#6366f1',
  resolved: '#22c55e', closed: '#6b7280', reopened: '#ef4444',
}
const PIE_COLORS = ['#3b82f6','#ef4444','#f97316','#22c55e','#a855f7','#eab308','#06b6d4','#6b7280']

interface Props {
  statusCounts: Record<string, number>
  categoryCounts: Record<string, number>
  dailyCounts: { date: string; count: number }[]
  metrics: { total: number; pending: number; inProgress: number; resolved: number; avgResolutionHours: number }
}

export default function AnalyticsCharts({ statusCounts, categoryCounts, dailyCounts, metrics }: Props) {
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.replace('_', ' '), value, fill: STATUS_COLORS[name] ?? '#6b7280',
  }))
  const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({
    name: name.replace('_', ' '), value,
  }))

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Reports', value: metrics.total, cls: 'bg-white' },
          { label: 'Pending', value: metrics.pending, cls: 'bg-yellow-50' },
          { label: 'In Progress', value: metrics.inProgress, cls: 'bg-blue-50' },
          { label: 'Resolved', value: metrics.resolved, cls: 'bg-green-50' },
        ].map(({ label, value, cls }) => (
          <div key={label} className={`${cls} rounded-2xl border border-gray-200 p-4 shadow-sm`}>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
        <div className="text-4xl font-bold text-gray-900">
          {metrics.avgResolutionHours > 0 ? `${metrics.avgResolutionHours}h` : '—'}
        </div>
        <div>
          <p className="font-semibold text-gray-900">Average Resolution Time</p>
          <p className="text-sm text-gray-500">Across all resolved reports</p>
        </div>
      </div>

      {/* Daily trend */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">Daily Reports — Last 30 Days</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dailyCounts}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#a855f7" strokeWidth={2.5} dot={false} name="Reports" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status bar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Reports by Status</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Reports">
                {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category pie */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Reports by Category</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
