import { cn } from '@/lib/utils/cn'
import type { ReportStatus } from '@/lib/types'

const STATUS_CONFIG: Record<ReportStatus, { label: string; className: string }> = {
  pending:      { label: 'Pending',      className: 'bg-orange-50 text-orange-700 border-orange-200/80 font-bold' },
  acknowledged: { label: 'Acknowledged', className: 'bg-[#C4511E]/10 text-[#C4511E] border-[#C4511E]/30 font-bold' },
  in_progress:  { label: 'In Progress',  className: 'bg-amber-50 text-amber-800 border-amber-300 font-bold' },
  resolved:     { label: 'Completed',    className: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-extrabold' },
  closed:       { label: 'Closed',       className: 'bg-gray-100 text-gray-700 border-gray-200 font-semibold' },
  reopened:     { label: 'Reopened',     className: 'bg-rose-50 text-rose-700 border-rose-200 font-bold' },
}

interface StatusBadgeProps {
  status: ReportStatus
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border shadow-2xs tracking-wide',
      config.className,
      className,
    )}>
      {config.label}
    </span>
  )
}

