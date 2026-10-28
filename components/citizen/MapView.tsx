'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORY_EMOJI, formatSnakeCase } from '@/lib/utils/constants'

const CATEGORY_COLORS: Record<string, { bg: string; border: string }> = {
  emergency: { bg: '#ef4444', border: '#991b1b' },
  electrical: { bg: '#f97316', border: '#9a3412' },
  water_leak: { bg: '#3b82f6', border: '#1e40af' },
  road_damage: { bg: '#4b5563', border: '#1f2937' },
  garbage: { bg: '#22c55e', border: '#166534' },
  graffiti: { bg: '#a855f7', border: '#6b21a8' },
  noise: { bg: '#eab308', border: '#854d0e' },
  other: { bg: '#6b7280', border: '#374151' },
}

const STATUS_BADGE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  acknowledged: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  in_progress: { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
  reopened: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
}

interface MapReport {
  id: string
  title: string
  category: string
  status: string
  address: string | null
  lat?: number
  lng?: number
  location?: any
  created_at?: string
}

interface MapViewProps {
  reports: MapReport[]
}

/**
 * Filter out closed, resolved, and completed reports so only active reports
 * (pending, acknowledged, in_progress, reopened) are displayed on the community map.
 */
export function isMapActiveReport(status?: string | null): boolean {
  if (!status) return true
  const s = status.toLowerCase()
  return s !== 'closed' && s !== 'resolved' && s !== 'completed'
}

function parseLocation(report: any): { lat: number; lng: number } {
  if (typeof report.lat === 'number' && typeof report.lng === 'number' && !isNaN(report.lat) && !isNaN(report.lng)) {
    return { lat: report.lat, lng: report.lng }
  }
  const loc = report.location
  if (loc) {
    if (typeof loc === 'object') {
      if (typeof loc.lat === 'number' && typeof loc.lng === 'number') return { lat: loc.lat, lng: loc.lng }
      if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) return { lng: Number(loc.coordinates[0]), lat: Number(loc.coordinates[1]) }
    }
    const str = String(loc).trim()
    if (str.startsWith('{')) {
      try {
        const g = JSON.parse(str)
        if (Array.isArray(g.coordinates)) return { lng: Number(g.coordinates[0]), lat: Number(g.coordinates[1]) }
      } catch {}
    }
    if (str.toUpperCase().includes('POINT')) {
      const m = str.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i)
      if (m) return { lng: parseFloat(m[1]), lat: parseFloat(m[2]) }
    }
    if (/^[0-9a-fA-F]+$/.test(str) && str.length >= 40) {
      try {
        const bytes = new Uint8Array(str.toLowerCase().match(/.{1,2}/g)!.map((b: string) => parseInt(b, 16)))
        const view = new DataView(bytes.buffer)
        const littleEndian = bytes[0] === 1
        const lng = view.getFloat64(bytes.length - 16, littleEndian)
        const lat = view.getFloat64(bytes.length - 8, littleEndian)
        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng }
      } catch {}
    }
  }
  const hash = Array.from(String(report.id || report.title || '1')).reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return { lat: 9.5100 + ((hash % 100) - 50) * 0.0004, lng: 77.6322 + (((hash * 7) % 100) - 50) * 0.0004 }
}

export default function MapView({ reports: initialReports }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import('leaflet').Map | null>(null)
  const [reports, setReports] = useState<MapReport[]>(() =>
    initialReports.filter((r) => isMapActiveReport(r.status))
  )
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'acknowledged'>('all')
  const [realtimeConnected, setRealtimeConnected] = useState(false)

  useEffect(() => {
    setReports(initialReports.filter((r) => isMapActiveReport(r.status)))
  }, [initialReports])

  // Realtime subscription for map updates:
  // - Adds new active reports (e.g. pending submissions)
  // - Updates active reports
  // - Automatically REMOVES reports that transition to closed or resolved/completed!
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('realtime_map_reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, (payload) => {
        setReports((current) => {
          if (payload.eventType === 'INSERT') {
            const next = payload.new as MapReport
            // Do not show on map if inserted with closed/resolved status
            if (!isMapActiveReport(next.status)) {
              return current
            }
            return current.some((r) => r.id === next.id) ? current : [next, ...current]
          }
          if (payload.eventType === 'UPDATE') {
            const next = payload.new as MapReport
            // If the report was resolved or closed, remove it immediately from map!
            if (!isMapActiveReport(next.status)) {
              return current.filter((r) => r.id !== next.id)
            }
            // Otherwise keep/update active report
            return current.some((r) => r.id === next.id)
              ? current.map((r) => (r.id === next.id ? { ...r, ...next } : r))
              : [next, ...current]
          }
          if (payload.eventType === 'DELETE') {
            return current.filter((r) => r.id !== (payload.old as any).id)
          }
          return current
        })
      })
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED')
        if (process.env.NODE_ENV === 'development') {
          console.info('[MapView] Realtime channel status:', status)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Filter reports displayed based on the selected status filter button
  const displayedReports = useMemo(() => {
    return reports.filter((r) => {
      if (!isMapActiveReport(r.status)) return false
      const s = (r.status || '').toLowerCase()
      if (statusFilter === 'pending') return s === 'pending'
      if (statusFilter === 'in_progress') return s === 'in_progress'
      if (statusFilter === 'acknowledged') return s === 'acknowledged'
      return true
    })
  }, [reports, statusFilter])

  const pendingCount = reports.filter((r) => (r.status || '').toLowerCase() === 'pending').length
  const inProgressCount = reports.filter((r) => (r.status || '').toLowerCase() === 'in_progress').length
  const ackCount = reports.filter((r) => (r.status || '').toLowerCase() === 'acknowledged').length

  useEffect(() => {
    if (!containerRef.current) return
    async function init() {
      const L = (await import('leaflet')).default
      if (!containerRef.current) return
      let map = mapRef.current
      if (!map) {
        map = L.map(containerRef.current, { zoomControl: true }).setView([20.5937, 78.9629], 5)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map)
        mapRef.current = map
      }

      // Remove existing marker layers
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.Circle || layer instanceof L.CircleMarker) {
          map?.removeLayer(layer)
        }
      })

      const bounds: import('leaflet').LatLngExpression[] = []

      displayedReports.forEach((report) => {
        const coords = parseLocation(report)
        const { lat, lng } = coords
        const colors = CATEGORY_COLORS[report.category] ?? CATEGORY_COLORS.other
        const emoji = CATEGORY_EMOJI[report.category] ?? '📋'
        const statusKey = (report.status || 'pending').toLowerCase()
        const badgeStyle = STATUS_BADGE_STYLE[statusKey] ?? { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' }

        bounds.push([lat, lng])

        // Outer Glow Circle indicating issue priority/radius
        L.circle([lat, lng], {
          radius: 120,
          color: colors.bg,
          fillColor: colors.bg,
          fillOpacity: 0.25,
          weight: 1.5,
        }).addTo(map!)

        // Center Pin Circle Marker
        L.circleMarker([lat, lng], {
          radius: 12,
          fillColor: colors.bg,
          color: '#ffffff',
          weight: 3,
          fillOpacity: 0.95,
        })
          .bindPopup(`
            <div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;padding:4px;min-width:200px">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
                <span style="font-size:18px">${emoji}</span>
                <strong style="color:#111827;font-size:14px;line-height:1.2">${report.title}</strong>
              </div>
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
                <span style="text-transform:capitalize;color:#4b5563;font-size:12px;font-weight:600">
                 ${formatSnakeCase(report.category)}
                </span>
                <span style="background:${badgeStyle.bg};color:${badgeStyle.text};border:1px solid ${badgeStyle.border};border-radius:6px;padding:2px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.02em">
                  ${formatSnakeCase(report.status)}
                </span>
              </div>
              ${report.address ? `<div style="color:#6b7280;font-size:11px;line-height:1.3;padding-top:4px;border-top:1px solid #f3f4f6">📍 ${report.address}</div>` : ''}
            </div>
          `)
          .addTo(map!)
      })

      if (bounds.length > 0) {
        map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 15 })
      }

      setTimeout(() => {
        map?.invalidateSize()
      }, 250)
    }
    init()
  }, [displayedReports])

  return (
    <div className="space-y-3">
      {/* Active Status Filters & Realtime Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white p-2.5 rounded-xl border border-gray-200">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-xs font-semibold text-gray-500 mr-1">Filter:</span>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              statusFilter === 'all'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Active ({reports.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              statusFilter === 'in_progress'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            In Progress ({inProgressCount})
          </button>
          {ackCount > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('acknowledged')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                statusFilter === 'acknowledged'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              Acknowledged ({ackCount})
            </button>
          )}
        </div>

        <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border self-start sm:self-auto ${
          realtimeConnected
            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
            : 'text-gray-500 bg-gray-50 border-gray-200'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${realtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
          <span>{realtimeConnected ? 'Map Live Sync' : 'Connecting…'}</span>
        </div>
      </div>

      {/* Leaflet Map Canvas */}
      <div ref={containerRef} className="w-full h-[65vh] min-h-[420px] rounded-2xl overflow-hidden border border-gray-200 shadow-md" />
    </div>
  )
}
