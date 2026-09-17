'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from '@/lib/utils/date'

const TYPE_ICON: Record<string, string> = {
  status_update: '??',
  dept_comment: '??',
  resolved: '?',
  nearby_issue: '??',
}

export default function NotificationDrawer({
  userId,
  onClose,
  onRead,
}: {
  userId: string
  onClose: () => void
  onRead: () => void
}) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setItems(data ?? [])
        setLoading(false)
      })
  }, [userId])

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null)
    setItems(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })))
    onRead()
  }

  function handleClick(n: any) {
    if (!n.read_at) {
      supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', n.id)
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
    }
    if (n.report_id) {
      onClose()
      router.push(`/reports/${n.report_id}`)
    }
  }

  const unreadCount = items.filter(n => !n.read_at).length

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-sm bg-white h-full flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-orange-600 flex items-center justify-between bg-orange-500 text-white shrink-0">
          <div>
            <h2 className="font-bold text-base">Notifications</h2>
            <p className="text-xs text-orange-100">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded transition text-lg leading-none"
            >
              ?
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {loading && (
            <p className="text-center text-gray-400 py-10 text-sm">Loading…</p>
          )}

          {!loading && items.length === 0 && (
            <div className="text-center py-16 text-gray-400 px-6">
              <p className="text-4xl mb-3">??</p>
              <p className="font-semibold text-gray-600">No notifications yet</p>
              <p className="text-xs mt-1">
                You will be notified when your reports are updated by the department.
              </p>
            </div>
          )}

          {items.map(n => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              className={`p-4 flex gap-3 transition ${
                n.report_id ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'
              } ${
                !n.read_at
                  ? 'border-l-4 border-orange-400 bg-orange-50/40'
                  : 'border-l-4 border-transparent'
              }`}
            >
              <span className="text-xl shrink-0 mt-0.5">
                {TYPE_ICON[n.type] ?? '??'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 leading-tight">
                  {n.title}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {n.body}
                </p>
                <p className="text-[11px] text-gray-400 mt-1" suppressHydrationWarning>
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </div>
              {!n.read_at && (
                <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-2" />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 shrink-0">
          <p className="text-[11px] text-gray-400 text-center">
            CivicTrack — Citizen Notification Centre
          </p>
        </div>
      </div>
    </div>
  )
}
