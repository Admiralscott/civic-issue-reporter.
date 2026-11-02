'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { enqueueReport, isOnline } from '@/lib/utils/offline-queue'
import { formatSnakeCase } from '@/lib/utils/constants'
import { MapPin, Camera, Loader2, CheckCircle, WifiOff, Map as MapIcon, X, Check } from 'lucide-react'
import type { ReportCategory } from '@/lib/types'

const LocationPickerModal = dynamic(() => import('@/components/citizen/LocationPickerModal'), {
  ssr: false,
})

export interface CategoryConfig {
  value: ReportCategory
  label: string
  emoji: string
  deptName: string
  deptId: string
  placeholder: string
  themeColor: string
  bgColor: string
  borderColor: string
  textColor: string
}

export const CATEGORY_CONFIG: CategoryConfig[] = [
  {
    value: 'road_damage',
    label: 'Road Damage',
    emoji: '🛣️',
    deptName: 'Road & Infra',
    deptId: 'a0241d48-0fe8-4e3f-aceb-16a65dea7d9b',
    placeholder: 'e.g. Pothole, damaged asphalt, missing manhole on 5th main road',
    themeColor: '#d35400',
    bgColor: '#fbeee6',
    borderColor: '#edbb99',
    textColor: '#78281f',
  },
  {
    value: 'water_leak',
    label: 'Water Leak',
    emoji: '💧',
    deptName: 'Water & Utilities',
    deptId: 'a11349e6-75f9-4787-9805-529bcd3a65ab',
    placeholder: 'e.g. Burst water main pipe, contaminated tap water, low pressure',
    themeColor: '#3498db',
    bgColor: '#ebf5fb',
    borderColor: '#aed6f1',
    textColor: '#21618c',
  },
  {
    value: 'electrical',
    label: 'Electrical',
    emoji: '⚡',
    deptName: 'Water & Utilities',
    deptId: 'a11349e6-75f9-4787-9805-529bcd3a65ab',
    placeholder: 'e.g. Broken streetlight, hanging power lines, transformer spark',
    themeColor: '#3498db',
    bgColor: '#ebf5fb',
    borderColor: '#aed6f1',
    textColor: '#21618c',
  },
  {
    value: 'garbage',
    label: 'Garbage',
    emoji: '🗑️',
    deptName: 'Sanitation',
    deptId: '4c021fbc-a68c-4fe0-be25-22453f443d90',
    placeholder: 'e.g. Overflowing garbage bin, unattended waste pile near street',
    themeColor: '#8bc34a',
    bgColor: '#f1f8e9',
    borderColor: '#c5e1a5',
    textColor: '#33691e',
  },
  {
    value: 'graffiti',
    label: 'Graffiti',
    emoji: '🎨',
    deptName: 'Sanitation',
    deptId: '4c021fbc-a68c-4fe0-be25-22453f443d90',
    placeholder: 'e.g. Defaced public boundary wall or unauthorized posters',
    themeColor: '#8bc34a',
    bgColor: '#f1f8e9',
    borderColor: '#c5e1a5',
    textColor: '#33691e',
  },
  {
    value: 'noise',
    label: 'Noise',
    emoji: '📢',
    deptName: 'Public Safety',
    deptId: '486112af-ac9a-4e20-b9dc-6f77e6dac235',
    placeholder: 'e.g. Unauthorized commercial loudspeakers after 10 PM',
    themeColor: '#ff851b',
    bgColor: '#fff4e6',
    borderColor: '#ffd8a8',
    textColor: '#b34700',
  },
  {
    value: 'emergency',
    label: 'Emergency',
    emoji: '🚨',
    deptName: 'Public Safety',
    deptId: '486112af-ac9a-4e20-b9dc-6f77e6dac235',
    placeholder: 'e.g. Fallen tree blocking road, hazardous public safety hazard',
    themeColor: '#ff851b',
    bgColor: '#fff4e6',
    borderColor: '#ffd8a8',
    textColor: '#b34700',
  },
  {
    value: 'other',
    label: 'Other',
    emoji: '📋',
    deptName: 'Public Safety',
    deptId: '486112af-ac9a-4e20-b9dc-6f77e6dac235',
    placeholder: 'e.g. General public assistance or civic grievance',
    themeColor: '#ff851b',
    bgColor: '#fff4e6',
    borderColor: '#ffd8a8',
    textColor: '#b34700',
  },
]

export default function ReportForm() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ReportCategory>('road_damage')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [address, setAddress] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [queued, setQueued] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [online, setOnline] = useState(true)
  const previewUrlsRef = useRef<string[]>([])
  const router = useRouter()

  const selectedConfig = CATEGORY_CONFIG.find((c) => c.value === category) ?? CATEGORY_CONFIG[0]

  useEffect(() => {
    setOnline(isOnline())
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      // Revoke any remaining blob URLs on unmount
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  const captureGPS = () => {
    setGpsLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        setLocation({ lat, lng })
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
            headers: { 'Accept-Language': 'en' },
          })
          const data = await res.json()
          setAddress(data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        } catch {
          setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        }
        setGpsLoading(false)
      },
      () => {
        setError('Location access denied. Please pick a location on the map.')
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const combined = [...photos, ...files].slice(0, 3)
    setPhotos(combined)
    // Revoke old blob URLs before creating new ones
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    const newUrls = combined.map((f) => URL.createObjectURL(f))
    previewUrlsRef.current = newUrls
    setPhotoPreviews(newUrls)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items ?? [])
    const pastedFiles: File[] = []

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          const ext = item.type.split('/')[1] || 'png'
          const renamedFile = new File([file], `pasted-${Date.now()}.${ext}`, { type: item.type })
          pastedFiles.push(renamedFile)
        }
      }
    }

    if (pastedFiles.length > 0) {
      e.preventDefault()
      const combined = [...photos, ...pastedFiles].slice(0, 3)
      setPhotos(combined)
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      const newUrls = combined.map((f) => URL.createObjectURL(f))
      previewUrlsRef.current = newUrls
      setPhotoPreviews(newUrls)
    }
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!location) {
      setError('Please select a location using GPS or the map picker.')
      setLoading(false)
      return
    }

    const finalLocation = location
    const reportData = { title, description, category, address, location: finalLocation }

    if (!online) {
      enqueueReport(reportData)
      setQueued(true)
      setLoading(false)
      return
    }

    try {
      const { getClientUser } = await import('@/lib/client-auth')
      const user = await getClientUser()

      if (!user?.id || user.id === 'demo-citizen-id') {
        setError('You must be signed in to submit a report. Please log in and try again.')
        setLoading(false)
        return
      }
      const userId = user.id
      const photoUrls: string[] = []
      const supabase = createClient()

      for (const photo of photos) {
        try {
          const ext = photo.name.split('.').pop()
          const path = `reports/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
          const { error: uploadErr } = await supabase.storage.from('report-photos').upload(path, photo)
          if (!uploadErr) {
            const { data: { publicUrl } } = supabase.storage.from('report-photos').getPublicUrl(path)
            photoUrls.push(publicUrl)
          } else {
            console.error('[ReportForm] Photo upload failed:', uploadErr.message)
          }
        } catch (err) {
          console.error('[ReportForm] Photo upload error:', err)
        }
      }

      const deptId = selectedConfig.deptId
      const reportTitle = title || `${formatSnakeCase(category).toUpperCase()} Report`
      const reportDesc = description || 'Civic issue report submitted by citizen.'

      const { data: inserted, error: insertErr } = await supabase.from('reports').insert({
        citizen_id: userId,
        title: reportTitle,
        description: reportDesc,
        category,
        photo_urls: photoUrls,
        address: address || 'Srivilliputhur, Virudhunagar, Tamil Nadu',
        location: `POINT(${finalLocation.lng} ${finalLocation.lat})`,
        assigned_dept_id: deptId,
      }).select().single()

      if (insertErr) {
        console.error('[ReportForm] DB insert failed:', insertErr.code, insertErr.message, insertErr.details)
        setError(`Failed to save report: ${insertErr.message}`)
        setLoading(false)
        return
      }

      if (process.env.NODE_ENV === 'development') {
        console.info('[ReportForm] Report inserted successfully, id:', inserted?.id, 'dept_id:', deptId)
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to submit. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success || queued) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
        {queued ? (
          <WifiOff className="w-14 h-14 text-orange-400 mx-auto mb-4" />
        ) : (
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
        )}
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {queued ? 'Saved for later' : 'Report submitted!'}
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          {queued
            ? "You're offline. Your report will submit automatically when you reconnect."
            : "We'll notify you when the status changes."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setSuccess(false)
              setQueued(false)
              setTitle('')
              setDescription('')
              setPhotos([])
              setPhotoPreviews([])
              setLocation(null)
              setAddress('')
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
          >
            New Report
          </button>
          <button
            onClick={() => router.push('/my-reports')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
          >
            My Reports
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <form onSubmit={handleSubmit} onPaste={handlePaste} className="space-y-5 bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
        {!online && (
          <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700">
            <WifiOff className="w-4 h-4" /> You're offline — reports will be queued and submitted when online
          </div>
        )}

        {/* Category Picker with Dynamic Department Badges */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              Issue Category *
            </label>
            <span className="text-[11px] font-semibold text-gray-400">
              Select category to route report
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CATEGORY_CONFIG.map((item) => {
              const isSelected = category === item.value

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setCategory(item.value)}
                  style={
                    isSelected
                      ? {
                          backgroundColor: item.bgColor,
                          borderColor: item.themeColor,
                          color: item.textColor,
                          boxShadow: `0 0 0 2px ${item.themeColor}33`,
                        }
                      : undefined
                  }
                  className={`flex items-center justify-between gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'border-2 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white hover:bg-gray-50/80 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base flex-shrink-0">{item.emoji}</span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  {isSelected && (
                    <div
                      style={{ backgroundColor: item.themeColor }}
                      className="w-4 h-4 rounded-full flex items-center justify-center text-white flex-shrink-0"
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Dynamic Department Routing Banner — Provides instant visual feedback */}
          <div
            style={{
              backgroundColor: selectedConfig.bgColor,
              borderColor: selectedConfig.borderColor,
            }}
            className="mt-3 p-3 rounded-xl border flex items-center justify-between transition-all shadow-2xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                style={{ backgroundColor: selectedConfig.themeColor }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-2xs flex-shrink-0"
              >
                {selectedConfig.emoji}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate" style={{ color: selectedConfig.textColor }}>
                  Assigned Department: <span className="underline">{selectedConfig.deptName}</span>
                </p>
                <p className="text-[11px] text-gray-600 truncate mt-0.5">
                  Issue will automatically route to the {selectedConfig.deptName} queue
                </p>
              </div>
            </div>
            <span
              style={{ backgroundColor: selectedConfig.themeColor }}
              className="text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full flex-shrink-0 ml-2 shadow-2xs"
            >
              {selectedConfig.deptName}
            </span>
          </div>
        </div>

        {/* Title Input with Dynamic Placeholder */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Issue Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={100}
            placeholder={selectedConfig.placeholder}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#C4511E] focus:border-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400 transition"
          />
        </div>

        {/* Details & Description */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Details & Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Add relevant landmark details or urgency description…"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#C4511E] focus:border-transparent outline-none resize-none text-sm text-gray-900 placeholder:text-gray-400 transition"
          />
        </div>

        {/* Location Picker Options */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Location
          </label>
          {location ? (
            <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <MapPin className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-emerald-800">Location selected ✓</p>
                <p className="text-xs text-emerald-600 mt-0.5 truncate">{address}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMapPicker(true)}
                className="text-xs text-[#C4511E] font-bold hover:underline flex-shrink-0 cursor-pointer"
              >
                Change
              </button>
              <button
                type="button"
                onClick={() => {
                  setLocation(null)
                  setAddress('')
                }}
                className="text-xs text-red-500 font-bold hover:underline flex-shrink-0 cursor-pointer"
              >
                Reset
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={captureGPS}
                disabled={gpsLoading}
                className="flex items-center justify-center gap-2 px-3 py-3 border border-gray-300 rounded-xl text-gray-700 bg-white hover:border-[#C4511E] hover:bg-[#C4511E]/5 transition text-xs font-bold cursor-pointer"
              >
                {gpsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#C4511E]" />
                ) : (
                  <MapPin className="w-4 h-4 text-[#C4511E]" />
                )}
                {gpsLoading ? 'Getting GPS…' : 'Capture GPS'}
              </button>

              <button
                type="button"
                onClick={() => setShowMapPicker(true)}
                className="flex items-center justify-center gap-2 px-3 py-3 border border-gray-300 rounded-xl text-gray-700 bg-white hover:border-[#C4511E] hover:bg-[#C4511E]/5 transition text-xs font-bold cursor-pointer"
              >
                <MapIcon className="w-4 h-4 text-purple-600" />
                Pick on Map
              </button>
            </div>
          )}
        </div>

        {/* Photos */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Photos (up to 3)
          </label>
          <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 bg-gray-50/50 rounded-xl text-gray-500 hover:border-[#C4511E] hover:text-[#C4511E] transition cursor-pointer text-xs font-semibold">
            <Camera className="w-4 h-4" />
            {photos.length > 0 ? `${photos.length} photo(s) selected` : 'Upload Photo Proof'}
            <input type="file" accept="image/*" multiple onChange={handlePhotos} className="hidden" />
          </label>
          {photoPreviews.length > 0 && (
            <div className="flex gap-3 mt-3 flex-wrap">
              {photoPreviews.map((src, i) => (
                <div key={i} className="relative group">
                  <img src={src} alt={`Preview ${i + 1}`} className="w-20 h-20 object-cover rounded-xl border border-gray-200 shadow-xs" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center font-bold text-xs shadow-md transition-transform hover:scale-110 cursor-pointer"
                    title="Remove Photo"
                  >
                    <X className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !title}
          className="w-full bg-[#C4511E] hover:bg-[#A83D0C] text-white py-3.5 rounded-xl font-extrabold text-sm tracking-wide shadow-md active:scale-[0.99] disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Submitting Report…' : online ? 'Submit Report' : 'Save Offline'}
        </button>
      </form>

      {/* Map Picker Modal */}
      {showMapPicker && (
        <LocationPickerModal
          initialLocation={location}
          onSelectLocation={(loc, addr) => {
            setLocation(loc)
            setAddress(addr)
          }}
          onClose={() => setShowMapPicker(false)}
        />
      )}
    </>
  )
}
