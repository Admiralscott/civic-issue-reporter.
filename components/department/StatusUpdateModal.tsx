'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ReportStatus } from '@/lib/types'
import { Loader2, Camera, CheckCircle2 } from 'lucide-react'

const NEXT_STATUSES: Record<ReportStatus, { value: ReportStatus; label: string }[]> = {
  pending:      [{ value: 'acknowledged', label: 'Acknowledge Report' }, { value: 'in_progress', label: 'Start Work (In Progress)' }],
  acknowledged: [{ value: 'in_progress', label: 'Start Work (In Progress)' }, { value: 'resolved', label: 'Mark as Resolved' }],
  in_progress:  [{ value: 'resolved', label: 'Mark as Resolved' }],
  resolved:     [{ value: 'closed', label: 'Close Report' }, { value: 'reopened', label: 'Reopen Report' }],
  closed:       [{ value: 'reopened', label: 'Reopen Report' }],
  reopened:     [{ value: 'in_progress', label: 'Start Work' }, { value: 'resolved', label: 'Mark as Resolved' }],
}

export default function StatusUpdateModal({
  reportId,
  currentStatus,
}: {
  reportId: string
  currentStatus: ReportStatus
}) {
  const [newStatus, setNewStatus] = useState<ReportStatus>(
    NEXT_STATUSES[currentStatus]?.[0]?.value ?? 'in_progress'
  )
  const [note, setNote] = useState('')
  const [resPhoto, setResPhoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const options = NEXT_STATUSES[currentStatus] ?? []

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let resPhotoUrl: string | null = null
      if (resPhoto && newStatus === 'resolved') {
        const path = `resolution/${reportId}/${Date.now()}.${resPhoto.name.split('.').pop()}`
        await supabase.storage.from('report-photos').upload(path, resPhoto)
        const { data: { publicUrl } } = supabase.storage.from('report-photos').getPublicUrl(path)
        resPhotoUrl = publicUrl
      }

      const { error: updateErr } = await supabase
        .from('reports')
        .update({
          status: newStatus,
          ...(resPhotoUrl && { resolution_photo_url: resPhotoUrl }),
          ...(newStatus === 'resolved' && { resolved_at: new Date().toISOString() }),
        })
        .eq('id', reportId)

      if (updateErr) throw updateErr

      await supabase.from('status_history').insert({
        report_id: reportId,
        changed_by: user.id,
        new_status: newStatus,
        note: note || null,
      })

      setSuccess(true)
      setTimeout(() => {
        router.refresh()
      }, 500)
    } catch (err: any) {
      setError(err.message ?? 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  if (options.length === 0) {
    return <p className="text-sm text-gray-500 italic">No status updates available for current status.</p>
  }

  return (
    <form onSubmit={handleUpdate} className="space-y-4">
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-green-600" /> Status updated successfully!
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">New Status</label>
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => (
            <button key={opt.value} type="button" onClick={() => setNewStatus(opt.value)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition ${
                newStatus === opt.value
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Internal Note (Optional)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
          placeholder="e.g. Dispatched Repair Crew 4 to site..."
          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 outline-none resize-none" />
      </div>

      {newStatus === 'resolved' && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Proof of Resolution Photo (Optional)</label>
          <label className="flex items-center justify-center gap-2 w-full px-3 py-2 border border-dashed border-gray-300 rounded-xl text-xs text-gray-500 cursor-pointer hover:border-orange-500">
            <Camera className="w-4 h-4 text-gray-400" />
            {resPhoto ? resPhoto.name : 'Upload proof photo'}
            <input type="file" accept="image/*" onChange={(e) => setResPhoto(e.target.files?.[0] ?? null)} className="hidden" />
          </label>
        </div>
      )}

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">{error}</div>}

      <button type="submit" disabled={loading}
        className="w-full bg-orange-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Updating...' : 'Update Status'}
      </button>
    </form>
  )
}
