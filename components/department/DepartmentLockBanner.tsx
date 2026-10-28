'use client'

import { useRouter } from 'next/navigation'
import { RefreshCw, Lock } from 'lucide-react'

interface Props {
  assignedDeptId: string
  assignedDeptName: string
  currentStaffDeptName: string
}

export default function DepartmentLockBanner({
  assignedDeptId,
  assignedDeptName,
  currentStaffDeptName,
}: Props) {
  const router = useRouter()

  const handleSwitchDept = () => {
    document.cookie = `civic_active_dept=${assignedDeptId}; path=/; max-age=86400; SameSite=Lax`
    router.refresh()
  }

  return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed space-y-3 shadow-2xs">
      <div>
        <p className="font-bold text-amber-800 flex items-center gap-1.5 text-sm">
          <Lock className="w-4 h-4 text-amber-600" />
          <span>Assigned to: {assignedDeptName}</span>
        </p>
        <p className="text-amber-700 mt-1">
          Your current staff session is assigned to <strong>{currentStaffDeptName}</strong>. By municipal security policy, status changes for this issue can only be performed by staff from <strong>{assignedDeptName}</strong> or a Municipal Administrator.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200/70">
        <button
          type="button"
          onClick={handleSwitchDept}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Switch Staff Role to {assignedDeptName} (Test Mode)</span>
        </button>
      </div>
    </div>
  )
}
