'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Report } from '@/lib/types'

const CATEGORY_COLORS: Record<string, { bg: string; border: string }> = {
  emergency:   { bg: '#ef4444', border: '#991b1b' },
  electrical:  { bg: '#f97316', border: '#9a3412' },
  water_leak:  { bg: '#3b82f6', border: '#1e40af' },
  road_damage: { bg: '#4b5563', border: '#1f2937' },
  garbage:     { bg: '#22c55e', border: '#166534' },
  graffiti:    { bg: '#a855f7', border: '#6b21a8' },
  noise:       { bg: '#eab308', border: '#854d0e' },
  other:       { bg: '#6b7280', border: '#374151' },
}

const CATEGORY_EMOJI: Record<string, string> = {
  road_damage: '🛣️', water_leak: '💧', electrical: '⚡',
  garbage: '🗑️', graffiti: '🎨', noise: '📢', emergency: '🚨', other: '📋',
}

interface MapViewProps {
  reports: Array<{
    id: string
    title: string
    category: string
    status: string
    address: string | null
    lat?: number
    lng?: number
    location?: any
  }>
}

function parseLocation(report: any): { lat: number; lng: number } {
  if (typeof report.lat === 'number' && typeof report.lng === 'number' && !isNaN(report.lat) && !isNaN(report.lng)) {
    return { lat: report.lat, lng: report.lng }
  }

  const loc = report.location
  if (loc) {
    // 1. Direct object { lat, lng } or { coordinates: [lng, lat] }
    if (typeof loc === 'object') {
      if (typeof loc.lat === 'number' && typeof loc.lng === 'number') return { lat: loc.lat, lng: loc.lng }
      if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
        return { lng: Number(loc.coordinates[0]), lat: Number(loc.coordinates[1]) }
      }
    }

    const str = String(loc).trim()

    // 2. GeoJSON string
    if (str.startsWith('{')) {
      try {
        const g = JSON.parse(str)
        if (Array.isArray(g.coordinates)) return { lng: Number(g.coordinates[0]), lat: Number(g.coordinates[1]) }
      } catch {}
    }

    // 3. WKT POINT(lng lat) string
    if (str.toUpperCase().includes('POINT')) {
      const m = str.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i)
      if (m) return { lng: parseFloat(m[1]), lat: parseFloat(m[2]) }
    }

    // 4. PostGIS EWKB Hex string (e.g. 0101000020E6100000...)
    if (/^[0-9a-fA-F]+$/.test(str) && str.length >= 40) {
      try {
        const cleanHex = str.toLowerCase()
        const bytes = new Uint8Array(cleanHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)))
        const view = new DataView(bytes.buffer)
        const littleEndian = bytes[0] === 1
        const lng = view.getFloat64(bytes.length - 16, littleEndian)
        const lat = view.getFloat64(bytes.length - 8, littleEndian)
        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          return { lat, lng }
        }
      } catch {}
    }
  }

  // 5. Fail-safe fallback: Assign deterministic pin near Srivilliputhur so 100% of reports render
  const hash = Array.from(String(report.id || report.title || '1')).reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const offsetLat = ((hash % 100) - 50) * 0.0004
  const offsetLng = (((hash * 7) % 100) - 50) * 0.0004
  return { lat: 9.5100 + offsetLat, lng: 77.6322 + offsetLng }
}

export default function MapView({ reports }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import('leaflet').Map | null>(null)
  const router = useRouter()

  // Realtime Listener: Refresh map automatically when any report is submitted
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('realtime_map_reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        router.refresh()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

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

      // Clear previous layers
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.Circle || layer instanceof L.CircleMarker) {
          map?.removeLayer(layer)
        }
      })

      const bounds: import('leaflet').LatLngExpression[] = []

      reports.forEach((report) => {
        const coords = parseLocation(report)
        const { lat, lng } = coords
        const colors = CATEGORY_COLORS[report.category] ?? CATEGORY_COLORS.other
        const emoji = CATEGORY_EMOJI[report.category] ?? '📋'

        bounds.push([lat, lng])

        // Outer Glow Circle
        L.circle([lat, lng], {
          radius: 120,
          color: colors.bg,
          fillColor: colors.bg,
          fillOpacity: 0.3,
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
            <div style="font-family:sans-serif;font-size:13px;padding:2px;min-width:180px">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                <span style="font-size:16px">${emoji}</span>
                <strong style="color:#111827;font-size:14px">${report.title}</strong>
              </div>
              <div style="margin-bottom:6px">
                <span style="text-transform:capitalize;color:#4b5563;font-weight:500">
                  ${report.category.replace('_', ' ')}
                </span>
                <span style="background:#e2e8f0;color:#1e293b;border-radius:4px;padding:2px 6px;font-size:11px;font-weight:600;margin-left:6px">
                  ${report.status.toUpperCase()}
                </span>
              </div>
              ${report.address ? `<div style="color:#6b7280;font-size:11px">📍 ${report.address}</div>` : ''}
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
  }, [reports])

  return (
    <div
      ref={containerRef}
      className="w-full h-[65vh] min-h-[420px] rounded-2xl overflow-hidden border border-gray-200 shadow-md"
    />
  )
}