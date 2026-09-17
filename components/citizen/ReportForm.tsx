'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { enqueueReport, isOnline } from '@/lib/utils/offline-queue'
import { MapPin, Camera, Loader2, CheckCircle, WifiOff, Map as MapIcon, X } from 'lucide-react'
import type { ReportCategory } from '@/lib/types'

const LocationPickerModal = dynamic(() => import('@/components/citizen/LocationPickerModal'), {
  ssr: false,
})

const CATEGORIES: { value: ReportCategory; label: string; emoji: string }[] = [
  { value: 'road_damage',  label: 'Road Damage',    emoji: '🛣️' },
  { value: 'water_leak',   label: 'Water Leak',     emoji: '💧' },
  { value: 'electrical',   label: 'Electrical',     emoji: '⚡' },
  { value: 'garbage',      label: 'Garbage',        emoji: '🗑️' },
  { value: 'graffiti',     label: 'Graffiti',       emoji: '🎨' },
  { value: 'noise',        label: 'Noise',          emoji: '📢' },
  { value: 'emergency',    label: 'Emergency',      emoji: '🚨' },
  { value: 'other',        label: 'Other',          emoji: '📋' },
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
  const router = useRouter()

  useEffect(() => {
    setOnline(isOnline())
    const handleOnline  = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => { window.removeEventListener('online',  handleOnline); window.removeEventListener('offline', handleOffline) }
  }, [])

  const captureGPS = () => {
    setGpsLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        setLocation({ lat, lng })
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { 'Accept-Language': 'en' } })
          const data = await res.json()
          setAddress(data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        } catch { setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`) }
        setGpsLoading(false)
      },
      () => { setError('Location access denied. Please pick a location on the map.'); setGpsLoading(false) },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const combined = [...photos, ...files].slice(0, 3)
    setPhotos(combined)
    setPhotoPreviews(combined.map((f) => URL.createObjectURL(f)))
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
      setPhotoPreviews(combined.map((f) => URL.createObjectURL(f)))
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

    // Fallback location if GPS / map picker was not used
    const finalLocation = location ?? {
      lat: 9.5100 + (Math.random() * 0.03 - 0.015),
      lng: 77.6322 + (Math.random() * 0.03 - 0.015),
    }

    const reportData = { title, description, category, address, location: finalLocation }

    if (!online) {
      enqueueReport(reportData as any)
      setQueued(true)
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      let user: any = session?.user

      if (!user) {
        const { data } = await supabase.auth.getUser()
        user = data.user
      }

      if (!user) {
        const { data: refreshData } = await supabase.auth.refreshSession()
        user = refreshData?.session?.user || refreshData?.user
      }

      const userId = user?.id
      if (!userId) throw new Error('Session expired. Please refresh the page or sign in to submit your report.')

      const photoUrls: string[] = []
      for (const photo of photos) {
        try {
          const ext = photo.name.split('.').pop()
          const path = `reports/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
          const { error: uploadErr } = await supabase.storage.from('report-photos').upload(path, photo)
          if (!uploadErr) {
            const { data: { publicUrl } } = supabase.storage.from('report-photos').getPublicUrl(path)
            photoUrls.push(publicUrl)
          }
        } catch (photoErr) {
          console.warn('Photo upload warning:', photoErr)
        }
      }

      const { data: depts } = await supabase.from('departments').select('id, name')
      let deptId: string | null = null
      if (depts && depts.length > 0) {
        if (category === 'water_leak') {
          deptId = depts.find((d) => d.name.toLowerCase().includes('water'))?.id ?? depts[0].id
        } else if (category === 'garbage' || category === 'graffiti' || category === 'noise') {
          deptId = depts.find((d) => d.name.toLowerCase().includes('sanitation') || d.name.toLowerCase().includes('waste'))?.id ?? depts[0].id
        } else {
          deptId = depts.find((d) => d.name.toLowerCase().includes('road') || d.name.toLowerCase().includes('infra'))?.id ?? depts[0].id
        }
      }

      const { error: insertErr } = await supabase.from('reports').insert({
        citizen_id: userId,
        title, description, category,
        photo_urls: photoUrls,
        address: address || 'Srivilliputhur, Virudhunagar, Tamil Nadu',
        location: `POINT(${finalLocation.lng} ${finalLocation.lat})`,
        assigned_dept_id: deptId,
      })
      if (insertErr) throw insertErr
      setSuccess(true)
    } catch (err: any) {
      setError(err.message ?? 'Failed to submit. Try again.')
    } finally { setLoading(false) }
  }

  if (success || queued) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
        {queued ? <WifiOff className="w-14 h-14 text-orange-400 mx-auto mb-4" /> : <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />}
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {queued ? 'Saved for later' : 'Report submitted!'}
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          {queued ? "You're offline. Your report will submit automatically when you reconnect." : "We'll notify you when the status changes."}
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setSuccess(false); setQueued(false); setTitle(''); setDescription(''); setPhotos([]); setPhotoPreviews([]); setLocation(null); setAddress('') }}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
            New Report
          </button>
          <button onClick={() => router.push('/my-reports')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
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

        {/* Category */}
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Issue Category *</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CATEGORIES.map(({ value, label, emoji }) => (
              <button key={value} type="button" onClick={() => setCategory(value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition text-left ${
                  category === value ? 'border-[#C4511E] bg-[#C4511E]/10 text-[#C4511E] ring-1 ring-[#C4511E] shadow-2xs' : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                }`}>
                <span className="text-base">{emoji}</span>
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Issue Title *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={100}
            placeholder="e.g. Broken streetlight on 5th main road"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#C4511E] focus:border-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400" />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Details & Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            placeholder="Add relevant landmark details or urgency description…"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#C4511E] focus:border-transparent outline-none resize-none text-sm text-gray-900 placeholder:text-gray-400" />
        </div>

        {/* Location Picker Options */}
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Location</label>
          {location ? (
            <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <MapPin className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-emerald-800">Location selected ✓</p>
                <p className="text-xs text-emerald-600 mt-0.5 truncate">{address}</p>
              </div>
              <button type="button" onClick={() => setShowMapPicker(true)} className="text-xs text-[#C4511E] font-bold hover:underline flex-shrink-0">Change</button>
              <button type="button" onClick={() => { setLocation(null); setAddress('') }} className="text-xs text-red-500 font-bold hover:underline flex-shrink-0">Reset</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={captureGPS} disabled={gpsLoading}
                className="flex items-center justify-center gap-2 px-3 py-3 border border-gray-300 rounded-xl text-gray-700 bg-white hover:border-[#C4511E] hover:bg-[#C4511E]/5 transition text-xs font-bold">
                {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin text-[#C4511E]" /> : <MapPin className="w-4 h-4 text-[#C4511E]" />}
                {gpsLoading ? 'Getting GPS…' : 'Capture GPS'}
              </button>

              <button type="button" onClick={() => setShowMapPicker(true)}
                className="flex items-center justify-center gap-2 px-3 py-3 border border-gray-300 rounded-xl text-gray-700 bg-white hover:border-[#C4511E] hover:bg-[#C4511E]/5 transition text-xs font-bold">
                <MapIcon className="w-4 h-4 text-purple-600" />
                Pick on Map
              </button>
            </div>
          )}
        </div>

        {/* Photos */}
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
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

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-medium">{error}</div>}

        <button type="submit" disabled={loading || !title}
          className="w-full bg-[#C4511E] hover:bg-[#A83D0C] text-white py-3.5 rounded-xl font-extrabold text-sm tracking-wide shadow-md active:scale-[0.99] disabled:opacity-50 transition flex items-center justify-center gap-2">
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
