'use client'

import { useEffect, useState } from 'react'
import type { Report } from '@/lib/types'
import StatusBadge from '@/components/shared/StatusBadge'
import { formatDistanceToNow, format } from '@/lib/utils/date'
import { createClient } from '@/lib/supabase/client'
import { MapPin, ThumbsUp, Calendar, CheckCircle2, ChevronRight, X, Clock, Building2, AlertTriangle, ShieldCheck, Check } from 'lucide-react'

const CATEGORY_EMOJI: Record<string, string> = {
  road_damage: '🛣️', water_leak: '💧', electrical: '⚡',
  garbage: '🗑️', graffiti: '🎨', noise: '📢', emergency: '🚨', other: '📋',
}

export default function ReportCard({ report }: { report: Report }) {
  const [showModal, setShowModal] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('status_history')
        .select('id, new_status, note, created_at')
        .eq('report_id', report.id)
        .order('created_at', { ascending: true })
      setHistory(data ?? [])
    } catch {
      setHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const openTracking = async () => {
    setShowModal(true)
    await loadHistory()
  }

  useEffect(() => {
    if (!showModal) return
    const supabase = createClient()
    const channel = supabase
      .channel(`realtime_status_history_${report.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'status_history', filter: `report_id=eq.${report.id}` }, (payload) => {
        setHistory((current) => {
          if (payload.eventType === 'INSERT') {
            const next = payload.new as any
            return current.some((h) => h.id === next.id) ? current : [...current, next]
          }
          if (payload.eventType === 'UPDATE') {
            const next = payload.new as any
            return current.map((h) => h.id === next.id ? next : h)
          }
          if (payload.eventType === 'DELETE') {
            return current.filter((h) => h.id !== (payload.old as any).id)
          }
          return current
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [showModal, report.id])

  const currentStatus = report.status
  const isAcknowledged = ['acknowledged', 'in_progress', 'resolved', 'closed'].includes(currentStatus)
  const isInProgress = ['in_progress', 'resolved', 'closed'].includes(currentStatus)
  const isResolved = ['resolved', 'closed'].includes(currentStatus)
  const steps = [
    { title: 'Report Submitted', desc: 'Received by CivicTrack Central System', done: true, time: report.created_at, icon: Clock },
    { title: 'Department Acknowledged', desc: 'Assigned to Municipal Response Team', done: isAcknowledged, icon: Building2 },
    { title: 'Work In Progress', desc: 'Field Engineers deployed to site', done: isInProgress, icon: AlertTriangle },
    { title: 'Issue Resolved', desc: 'Work completed & quality verified', done: isResolved, icon: ShieldCheck },
  ]

  return (
    <>
      <div className="bg-white rounded-3xl border border-gray-200/90 p-5 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
        <div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-xl flex-shrink-0">{CATEGORY_EMOJI[report.category] ?? '📋'}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2"><h3 className="font-extrabold text-gray-900 text-sm line-clamp-1">{report.title}</h3><StatusBadge status={report.status} className="flex-shrink-0" /></div>
              {report.description && <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">{report.description}</p>}
              {report.address && <div className="flex items-center gap-1 text-xs text-gray-500 mt-2 font-medium"><MapPin className="w-3.5 h-3.5 text-[#C4511E] flex-shrink-0" /><span className="truncate">{report.address}</span></div>}
              <div className="flex items-center gap-4 mt-2.5 text-[11px] text-gray-400 font-medium"><div className="flex items-center gap-1" suppressHydrationWarning><Calendar className="w-3 h-3" />{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</div><div className="flex items-center gap-1"><ThumbsUp className="w-3 h-3 text-[#C4511E]" />{report.upvote_count} Upvotes</div></div>
            </div>
          </div>
          {report.photo_urls && report.photo_urls.length > 0 && <div className="mt-3 pt-3 border-t border-gray-100"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Attached Photos:</p><div className="flex gap-2">{report.photo_urls.slice(0, 3).map((url, i) => <img key={i} src={url} alt={`Issue Photo ${i + 1}`} className="w-16 h-16 object-cover rounded-xl border border-gray-200" />)}</div></div>}
        </div>
        {report.resolution_photo_url ? <div className="mt-4 pt-3 border-t border-emerald-200 bg-emerald-50/80 -mx-5 -mb-5 p-4"><div className="flex items-center justify-between gap-2 mb-2"><div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800"><CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />Proof of Resolution (Department Verified)</div><button type="button" onClick={openTracking} className="text-xs font-bold text-[#C4511E] hover:underline cursor-pointer">Track History &gt;</button></div><img src={report.resolution_photo_url} alt="Proof of Resolution" className="w-full h-40 object-cover rounded-2xl border border-emerald-300 shadow-xs" /></div> : <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between"><span className="text-[11px] font-semibold text-gray-400">Request ID: #{report.id.slice(0, 8)}</span><button type="button" onClick={openTracking} className="inline-flex items-center gap-1 px-4 py-2 bg-[#C4511E] hover:bg-[#A83D0C] text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"><span>Track Status</span><ChevronRight className="w-3.5 h-3.5" /></button></div>}
      </div>

      {showModal && <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowModal(false)}><div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-150 relative overflow-hidden max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-gray-100 pb-4 mb-4"><div><div className="flex items-center gap-2"><span className="text-xl">{CATEGORY_EMOJI[report.category] ?? '📋'}</span><h3 className="font-extrabold text-gray-900 text-base">{report.title}</h3></div><p className="text-xs text-gray-400 mt-0.5">Request ID: #{report.id}</p></div><button type="button" onClick={() => setShowModal(false)} className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition cursor-pointer"><X className="w-4 h-4" /></button></div>
        <div className="overflow-y-auto space-y-6 flex-1 pr-1"><div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600">Current Live Status</p><p className="text-sm font-bold text-gray-900 capitalize mt-0.5">{report.status.replace('_', ' ')}</p></div><StatusBadge status={report.status} /></div>
          <div><h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-4">Resolution Progress Stepper</h4><div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">{steps.map((step, idx) => { const Icon = step.icon; return <div key={idx} className="flex items-start gap-3.5 relative z-10"><div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${step.done ? 'bg-[#C4511E] text-white shadow-md ring-4 ring-orange-100' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>{step.done ? <Check className="w-4 h-4 stroke-[3]" /> : <Icon className="w-4 h-4" />}</div><div className="flex-1 pt-0.5"><p className={`text-xs font-bold ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>{step.title}</p><p className="text-[11px] text-gray-500 mt-0.5">{step.desc}</p>{step.time && <p className="text-[10px] text-gray-400 mt-1 font-mono" suppressHydrationWarning>{format(new Date(step.time), 'MMM d, yyyy · h:mm a')}</p>}</div></div>})}</div></div>
          <div><h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-3">Official Department Notes</h4>{loadingHistory ? <p className="text-xs text-gray-400 py-4 text-center">Loading department updates...</p> : history.length === 0 ? <div className="bg-gray-50 rounded-xl p-3.5 text-center text-xs text-gray-500 border border-gray-100">No departmental notes logged yet. Updates will appear here as staff work on your request.</div> : <div className="space-y-2.5">{history.map((h: any) => <div key={h.id} className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs"><div className="flex items-center justify-between mb-1"><span className="font-bold text-gray-800 capitalize bg-white px-2 py-0.5 rounded border border-gray-200 text-[10px]">{h.new_status.replace('_', ' ')}</span><span className="text-[10px] text-gray-400" suppressHydrationWarning>{format(new Date(h.created_at), 'MMM d, h:mm a')}</span></div>{h.note && <p className="text-gray-600 mt-1 italic font-medium">{h.note}</p>}</div>)}</div>}</div>
        </div><div className="pt-4 border-t border-gray-100 mt-4 flex items-center justify-between"><span className="text-[10px] text-gray-400 font-medium">CivicTrack Realtime Progress Service</span><button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-[#C4511E] hover:bg-[#A83D0C] text-white rounded-xl text-xs font-extrabold shadow-xs transition cursor-pointer">Close Tracking</button></div>
      </div></div>}
    </>
  )
}
