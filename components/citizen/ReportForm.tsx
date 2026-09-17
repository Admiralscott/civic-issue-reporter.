'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { enqueueReport, isOnline } from '@/lib/utils/offline-queue'
import { MapPin, Camera, Loader2, CheckCircle, WifiOff, Map as MapIcon } from 'lucide-react'
import type { ReportCategory } from '@/lib/types'

const LocationPickerModal = dynamic(() => import('@/components/citizen/LocationPickerModal'), { ssr: false })
const MAX_PHOTO_BYTES = 10 * 1024 * 1024
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const CATEGORIES: { value: ReportCategory; label: string; emoji: string }[] = [
  { value: 'road_damage', label: 'Road Damage', emoji: '🛣️' },
  { value: 'water_leak', label: 'Water Leak', emoji: '💧' },
  { value: 'electrical', label: 'Electrical', emoji: '⚡' },
  { value: 'garbage', label: 'Garbage', emoji: '🗑️' },
  { value: 'graffiti', label: 'Graffiti', emoji: '🎨' },
  { value: 'noise', label: 'Noise', emoji: '📢' },
  { value: 'emergency', label: 'Emergency', emoji: '🚨' },
  { value: 'other', label: 'Other', emoji: '📋' },
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
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
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
        } catch {
          setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        }
        setGpsLoading(false)
      },
      () => {
        setError('Location access denied. Please pick a location on the map.')
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 3)
    const invalid = files.find((file) => !ALLOWED_PHOTO_TYPES.has(file.type) || file.size > MAX_PHOTO_BYTES)
    if (invalid) {
      setError('Photos must be JPEG, PNG, or WebP and 10 MB or smaller.')
      setPhotos([])
      setPhotoPreviews([])
      return
    }
    setError(null)
    setPhotos(files)
    setPhotoPreviews(files.map((f) => URL.createObjectURL(f)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const photoUrls: string[] = []
      for (const photo of photos) {
        if (!ALLOWED_PHOTO_TYPES.has(photo.type) || photo.size > MAX_PHOTO_BYTES) {
          throw new Error('Invalid photo. Use JPEG, PNG, or WebP images up to 10 MB.')
        }
        const extension = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg'
        const path = `reports/${user.id}/${crypto.randomUUID()}.${extension}`
        const { error: uploadErr } = await supabase.storage.from('report-photos').upload(path, photo, {
          contentType: photo.type,
          upsert: false,
        })
        if (uploadErr) throw uploadErr
        const { data: { publicUrl } } = supabase.storage.from('report-photos').getPublicUrl(path)
        photoUrls.push(publicUrl)
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
        citizen_id: user.id,
        title,
        description,
        category,
        photo_urls: photoUrls,
        address: address || 'Srivilliputhur, Virudhunagar, Tamil Nadu',
        location: `POINT(${finalLocation.lng} ${finalLocation.lat})`,
        assigned_dept_id: deptId,
      })
      if (insertErr) throw insertErr
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success || queued) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
        {queued ? <WifiOff className="w-14 h-14 text-orange-400 mx-auto mb-4" /> : <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />}
        <h2 className="text-xl font-bold text-gray-900 mb-2">{queued ? 'Saved for later' : 'Report submitted!'}</h2>
        <p className="text-gray-500 text-sm mb-6">{queued ? "You're offline. Your report will submit automatically when you reconnect." : "We'll notify you when the status changes."}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setSuccess(false); setQueued(false); setTitle(''); setDescription(''); setPhotos([]); setPhotoPreviews([]); setLocation(null); setAddress('') }} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">New Report</button>
          <button onClick={() => router.push('/my-reports')} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition">My Reports</button>
        </div>
      </div>
    )
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
        {!online && <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700"><WifiOff className="w-4 h-4" /> You're offline — reports will be queued and submitted when online</div>}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Issue Type *</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(({ value, label, emoji }) => (
              <button key={value} type="button" onClick={() => setCategory(value)} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition text-left ${category === value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                <span>{emoji}</span>{label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={100} placeholder="Brief description of the issue" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Details</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={5000} placeholder="Any additional details that might help…" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-sm" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Location</label>
          {location ? (
            <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
              <MapPin className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-green-800">Location selected ✓</p><p className="text-xs text-green-600 mt-0.5 truncate">{address}</p></div>
              <button type="button" onClick={() => setShowMapPicker(true)} className="text-xs text-blue-600 hover:underline flex-shrink-0">Change</button>
              <button type="button" onClick={() => { setLocation(null); setAddress('') }} className="text-xs text-red-500 hover:underline flex-shrink-0">Reset</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={captureGPS} disabled={gpsLoading} className="flex items-center justify-center gap-2 px-3 py-3 border border-gray-300 rounded-xl text-gray-700 hover:border-blue-500 hover:bg-blue-50 transition text-sm font-medium">
                {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <MapPin className="w-4 h-4 text-blue-600" />}
                {gpsLoading ? 'Getting GPS…' : 'Capture GPS'}
              </button>
              <button type="button" onClick={() => setShowMapPicker(true)} className="flex items-center justify-center gap-2 px-3 py-3 border border-gray-300 rounded-xl text-gray-700 hover:border-blue-500 hover:bg-blue-50 transition text-sm font-medium"><MapIcon className="w-4 h-4 text-purple-600" /> Pick on Map</button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Photos (up to 3)</label>
          <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 transition cursor-pointer text-sm">
            <Camera className="w-4 h-4" />{photos.length > 0 ? `${photos.length} photo(s) selected` : 'Add photos'}
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handlePhotos} className="hidden" />
          </label>
          {photoPreviews.length > 0 && <div className="flex gap-2 mt-2">{photoPreviews.map((src, i) => <img key={i} src={src} alt="" className="w-16 h-16 object-cover rounded-xl border border-gray-200" />)}</div>}
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

        <button type="submit" disabled={loading || !title} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}{loading ? 'Submitting…' : online ? 'Submit Report' : 'Save Offline'}
        </button>
      </form>

      {showMapPicker && <LocationPickerModal initialLocation={location} onSelectLocation={(loc, addr) => { setLocation(loc); setAddress(addr) }} onClose={() => setShowMapPicker(false)} />}
    </>
  )
}
