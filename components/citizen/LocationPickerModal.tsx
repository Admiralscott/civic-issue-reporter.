'use client'

import { useEffect, useRef } from 'react'
import { X, Check } from 'lucide-react'

interface LocationPickerModalProps {
  initialLocation: { lat: number; lng: number } | null
  onSelectLocation: (loc: { lat: number; lng: number }, address: string) => void
  onClose: () => void
}

export default function LocationPickerModal({
  initialLocation,
  onSelectLocation,
  onClose,
}: LocationPickerModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedLocRef = useRef<{ lat: number; lng: number } | null>(initialLocation)
  const selectedAddressRef = useRef<string>('')

  useEffect(() => {
    if (!containerRef.current) return

    let map: import('leaflet').Map
    let marker: import('leaflet').Marker

    async function init() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')

      if (!containerRef.current) return
      if ((containerRef.current as any)._leaflet_id) return

      const defaultLat = initialLocation?.lat ?? 9.5100
      const defaultLng = initialLocation?.lng ?? 77.6322

      map = L.map(containerRef.current, { zoomControl: true }).setView([defaultLat, defaultLng], 14)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)

      // Fix marker icon URL
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map)

      const updateAddress = async (lat: number, lng: number) => {
        selectedLocRef.current = { lat, lng }
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
            headers: { 'Accept-Language': 'en' },
          })
          const data = await res.json()
          selectedAddressRef.current = data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
        } catch {
          selectedAddressRef.current = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
        }
      }

      updateAddress(defaultLat, defaultLng)

      map.on('click', (e) => {
        const { lat, lng } = e.latlng
        marker.setLatLng([lat, lng])
        updateAddress(lat, lng)
      })

      marker.on('dragend', () => {
        const pt = marker.getLatLng()
        updateAddress(pt.lat, pt.lng)
      })

      setTimeout(() => map.invalidateSize(), 200)
    }

    init()
  }, [initialLocation])

  const handleConfirm = () => {
    if (selectedLocRef.current) {
      onSelectLocation(selectedLocRef.current, selectedAddressRef.current)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-xl border border-gray-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900 text-base sm:text-lg">Pick Location on Map</h3>
            <p className="text-xs text-gray-500">Click or drag the pin to set the exact issue location</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative flex-1 min-h-[360px]">
          <div ref={containerRef} className="absolute inset-0 w-full h-full" />
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-white">
            Cancel
          </button>
          <button onClick={handleConfirm} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Confirm Location
          </button>
        </div>
      </div>
    </div>
  )
}
