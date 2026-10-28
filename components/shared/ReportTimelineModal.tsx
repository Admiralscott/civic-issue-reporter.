'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Report } from '@/lib/types'
import StatusBadge from '@/components/shared/StatusBadge'
import { formatDistanceToNow, format } from '@/lib/utils/date'
import { CATEGORY_EMOJI, formatSnakeCase } from '@/lib/utils/constants'
import {
  X,
  Clock,
  Building2,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  TrendingUp,
  Check,
  Calendar,
  ShieldCheck,
  FileText,
  Camera,
  User,
} from 'lucide-react'

interface ReportWithDept extends Report {
  departments?: { name: string } | null
}

interface ReportTimelineModalProps {
  report: ReportWithDept | null
  onClose: () => void
}

export default function ReportTimelineModal({ report, onClose }: ReportTimelineModalProps) {
  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    if (!report?.id) return

    let isMounted = true

    async function fetchHistory() {
      setLoadingHistory(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('status_history')
          .select('id, new_status, old_status, note, created_at, changed_by, users(full_name, role)')
          .eq('report_id', report!.id)
          .order('created_at', { ascending: true })

        if (!error && data && isMounted) {
          setHistory(data)
        }
      } catch (err) {
        console.error('[ReportTimelineModal] History fetch error:', err)
      } finally {
        if (isMounted) setLoadingHistory(false)
      }
    }

    fetchHistory()

    // Realtime listener for live status and history updates
    const supabase = createClient()
    const channel = supabase
      .channel(`timeline_history_${report.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'status_history',
          filter: `report_id=eq.${report.id}`,
        },
        (payload) => {
          setHistory((current) => {
            if (payload.eventType === 'INSERT') {
              const next = payload.new as any
              return current.some((h) => h.id === next.id) ? current : [...current, next]
            }
            if (payload.eventType === 'UPDATE') {
              const next = payload.new as any
              return current.map((h) => (h.id === next.id ? next : h))
            }
            if (payload.eventType === 'DELETE') {
              return current.filter((h) => h.id !== (payload.old as any).id)
            }
            return current
          })
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [report?.id])

  if (!report) return null

  const status = report.status || 'pending'
  const isAcknowledged = ['acknowledged', 'in_progress', 'resolved', 'closed'].includes(status)
  const isInProgress = ['in_progress', 'resolved', 'closed'].includes(status)
  const isResolved = ['resolved', 'closed'].includes(status)

  const steps = [
    {
      title: 'Report Submitted',
      desc: 'Logged in Central Civic Issue Registry',
      done: true,
      time: report.created_at,
      icon: Clock,
    },
    {
      title: 'Department Assigned & Acknowledged',
      desc: report.departments?.name
        ? `Routed to ${report.departments.name}`
        : 'Assigned to Municipal Response Team',
      done: isAcknowledged,
      icon: Building2,
    },
    {
      title: 'Field Work In Progress',
      desc: 'Municipal crew & engineers dispatched to site',
      done: isInProgress,
      icon: AlertTriangle,
    },
    {
      title: 'Issue Resolved & Quality Verified',
      desc: 'Field work concluded and case closed',
      done: isResolved,
      time: report.resolved_at ?? undefined,
      icon: ShieldCheck,
    },
  ]

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex items-center justify-between border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2 bg-white/10 rounded-xl">
              {CATEGORY_EMOJI[report.category] ?? '📋'}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-white line-clamp-1">{report.title}</h3>
                <span className="text-[11px] font-mono bg-white/15 px-2 py-0.5 rounded text-gray-200">
                  #{report.id.slice(0, 8)}
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-0.5">
                {report.departments?.name ? `${report.departments.name} · ` : ''}
                {formatSnakeCase(report.category)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-gray-50/40">
          {/* Current Live Status Card */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                Current Live Status
              </p>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={report.status} />
                <span className="text-xs font-semibold text-gray-700 capitalize">
                  {formatSnakeCase(report.status)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-500 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
                <span>Priority: <strong>{Math.round(report.priority_score)}</strong></span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1" suppressHydrationWarning>
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>

          {/* Location & Description */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
            {report.address && (
              <div className="flex items-start gap-2 text-xs text-gray-600">
                <MapPin className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <span className="font-medium">{report.address}</span>
              </div>
            )}
            {report.description ? (
              <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100 leading-relaxed">
                {report.description}
              </p>
            ) : (
              <p className="text-xs text-gray-400 italic">No additional citizen description provided.</p>
            )}
          </div>

          {/* Attached Citizen Photos */}
          {report.photo_urls && report.photo_urls.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-gray-400" /> Attached Photo Proof ({report.photo_urls.length})
              </p>
              <div className="flex gap-2 flex-wrap">
                {report.photo_urls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Photo ${i + 1}`}
                    className="w-20 h-20 object-cover rounded-xl border border-gray-200 shadow-xs"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Resolution Proof Photo (if present) */}
          {report.resolution_photo_url && (
            <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200">
              <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Official Department Proof of Resolution
              </p>
              <img
                src={report.resolution_photo_url}
                alt="Proof of Resolution"
                className="w-full max-h-48 object-cover rounded-xl border border-emerald-300 shadow-xs"
              />
            </div>
          )}

          {/* Timeline / Progress Stepper */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-4 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-orange-600" /> Resolution Workflow Timeline
            </h4>
            <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
              {steps.map((step, idx) => {
                const Icon = step.icon
                return (
                  <div key={idx} className="flex items-start gap-3.5 relative z-10">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                        step.done
                          ? 'bg-orange-600 text-white shadow-sm ring-4 ring-orange-100'
                          : 'bg-gray-100 text-gray-400 border border-gray-200'
                      }`}
                    >
                      {step.done ? <Check className="w-4 h-4 stroke-[3]" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className={`text-xs font-bold ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.title}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{step.desc}</p>
                      {step.time && (
                        <p className="text-[10px] text-gray-400 mt-0.5 font-mono" suppressHydrationWarning>
                          {format(new Date(step.time), 'MMM d, yyyy · h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Activity Log / Field Notes */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-purple-600" /> Department Field Log &amp; Status Notes
              </span>
              <span className="text-[10px] font-mono text-gray-400">
                {history.length} update(s)
              </span>
            </h4>

            {loadingHistory ? (
              <p className="text-xs text-gray-400 py-3 text-center">Loading activity log…</p>
            ) : history.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-3 text-center text-xs text-gray-400 border border-gray-100">
                No departmental field notes logged for this request yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {history.map((h: any) => (
                  <div key={h.id} className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-800 capitalize bg-white px-2 py-0.5 rounded border border-gray-200 text-[11px]">
                          Status → {formatSnakeCase(h.new_status)}
                        </span>
                        {h.users?.full_name && (
                          <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                            <User className="w-3 h-3 text-gray-400" />
                            {h.users.full_name}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono" suppressHydrationWarning>
                        {format(new Date(h.created_at), 'MMM d, yyyy · h:mm a')}
                      </span>
                    </div>
                    {h.note && (
                      <p className="text-gray-700 mt-1.5 italic bg-white p-2 rounded-lg border border-gray-200 text-xs">
                        "{h.note}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-gray-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-gray-400 font-medium">
            CivicTrack Executive Oversight Service
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Close Timeline
          </button>
        </div>
      </div>
    </div>
  )
}

