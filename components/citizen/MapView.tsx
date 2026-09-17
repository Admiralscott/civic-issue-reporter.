'use client'

import { useEffect, useRef, useState } from 'react'
import type { Report } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

const CATEGORY_COLORS: Record<string, { bg: string; border: string }> = {
  emergency: { bg: '#ef4444', border: '#991b1b' }, electrical: { bg: '#f97316', border: '#9a3412' }, water_leak: { bg: '#3b82f6', border: '#1e40af' }, road_damage: { bg: '#4b5563', border: '#1f2937' }, garbage: { bg: '#22c55e', border: '#166534' }, graffiti: { bg: '#a855f7', border: '#6b21a8' }, noise: { bg: '#eab308', border: '#854d0e' }, other: { bg: '#6b7280', border: '#374151' },
}
const CATEGORY_EMOJI: Record<string, string> = { road_damage: '🛣️', water_leak: '💧', electrical: '⚡', garbage: '🗑️', graffiti: '🎨', noise: '📢', emergency: '🚨', other: '📋' }
interface MapViewProps { reports: Array<{ id: string; title: string; category: string; status: string; address: string | null; lat?: number; lng?: number; location?: any }> }
function parseLocation(report: any): { lat: number; lng: number } {
  if (typeof report.lat === 'number' && typeof report.lng === 'number' && !isNaN(report.lat) && !isNaN(report.lng)) return { lat: report.lat, lng: report.lng }
  const loc = report.location
  if (loc) {
    if (typeof loc === 'object') {
      if (typeof loc.lat === 'number' && typeof loc.lng === 'number') return { lat: loc.lat, lng: loc.lng }
      if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) return { lng: Number(loc.coordinates[0]), lat: Number(loc.coordinates[1]) }
    }
    const str = String(loc).trim()
    if (str.startsWith('{')) { try { const g = JSON.parse(str); if (Array.isArray(g.coordinates)) return { lng: Number(g.coordinates[0]), lat: Number(g.coordinates[1]) } } catch {} }
    if (str.toUpperCase().includes('POINT')) { const m = str.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i); if (m) return { lng: parseFloat(m[1]), lat: parseFloat(m[2]) } }
    if (/^[0-9a-fA-F]+$/.test(str) && str.length >= 40) { try { const bytes = new Uint8Array(str.toLowerCase().match(/.{1,2}/g)!.map((b: string) => parseInt(b, 16))); const view = new DataView(bytes.buffer); const littleEndian = bytes[0] === 1; const lng = view.getFloat64(bytes.length - 16, littleEndian); const lat = view.getFloat64(bytes.length - 8, littleEndian); if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng } } catch {} }
  }
  const hash = Array.from(String(report.id || report.title || '1')).reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return { lat: 9.5100 + ((hash % 100) - 50) * 0.0004, lng: 77.6322 + (((hash * 7) % 100) - 50) * 0.0004 }
}

export default function MapView({ reports: initialReports }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import('leaflet').Map | null>(null)
  const [reports, setReports] = useState(initialReports)

  useEffect(() => { setReports(initialReports) }, [initialReports])
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('realtime_map_reports').on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, (payload) => {
      setReports((current) => {
        if (payload.eventType === 'INSERT') { const next = payload.new as any; return current.some((r) => r.id === next.id) ? current : [next, ...current] }
        if (payload.eventType === 'UPDATE') { const next = payload.new as any; return current.some((r) => r.id === next.id) ? current.map((r) => r.id === next.id ? { ...r, ...next } : r) : [next, ...current] }
        if (payload.eventType === 'DELETE') return current.filter((r) => r.id !== (payload.old as any).id)
        return current
      })
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    async function init() {
      const L = (await import('leaflet')).default
      if (!containerRef.current) return
      let map = mapRef.current
      if (!map) { map = L.map(containerRef.current, { zoomControl: true }).setView([20.5937, 78.9629], 5); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19 }).addTo(map); mapRef.current = map }
      map.eachLayer((layer) => { if (layer instanceof L.Marker || layer instanceof L.Circle || layer instanceof L.CircleMarker) map?.removeLayer(layer) })
      const bounds: import('leaflet').LatLngExpression[] = []
      reports.forEach((report) => { const { lat, lng } = parseLocation(report); const colors = CATEGORY_COLORS[report.category] ?? CATEGORY_COLORS.other; const emoji = CATEGORY_EMOJI[report.category] ?? '📋'; bounds.push([lat, lng]); L.circle([lat, lng], { radius: 120, color: colors.bg, fillColor: colors.bg, fillOpacity: 0.3, weight: 1.5 }).addTo(map!); L.circleMarker([lat, lng], { radius: 12, fillColor: colors.bg, color: '#ffffff', weight: 3, fillOpacity: 0.95 }).bindPopup(`<div style="font-family:sans-serif;font-size:13px;padding:2px;min-width:180px"><div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="font-size:16px">${emoji}</span><strong style="color:#111827;font-size:14px">${report.title}</strong></div><div style="margin-bottom:6px"><span style="text-transform:capitalize;color:#4b5563;font-weight:500">${report.category.replace('_', ' ')}</span><span style="background:#e2e8f0;color:#1e293b;border-radius:4px;padding:2px 6px;font-size:11px;font-weight:600;margin-left:6px">${report.status.toUpperCase()}</span></div>${report.address ? `<div style="color:#6b7280;font-size:11px">📍 ${report.address}</div>` : ''}</div>`).addTo(map!) })
      if (bounds.length > 0) map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 15 })
      setTimeout(() => map?.invalidateSize(), 250)
    }
    init()
  }, [reports])
  return <div ref={containerRef} className="w-full h-[65vh] min-h-[420px] rounded-2xl overflow-hidden border border-gray-200 shadow-md" />
}
