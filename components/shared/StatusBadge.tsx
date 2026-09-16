import { cn } from '@/lib/utils/cn'
import type { ReportStatus } from '@/lib/types'

const STATUS_CONFIG: Record<ReportStatus, { label: string; className: string }> = {
  pending:      { label: 'Pending',      className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  acknowledged: { label: 'Acknowledged', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  in_progress:  { label: 'In Progress',  className: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  resolved:     { label: 'Resolved',     className: 'bg-green-100 text-green-800 border-green-200' },
  closed:       { label: 'Closed',       className: 'bg-gray-100 text-gray-700 border-gray-200' },
  reopened:     { label: 'Reopened',     className: 'bg-red-100 text-red-800 border-red-200' },
}

interface StatusBadgeProps {
  status: ReportStatus
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
      config.className,
      className,
    )}>
      {config.label}
    </span>
  )
}
