import type { Metadata } from 'next'
import ReportForm from '@/components/citizen/ReportForm'

export const metadata: Metadata = { title: 'Report an Issue' }

export default function ReportPage() {
  return (
    <div>
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-5 border border-gray-200/90 shadow-sm mb-5">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Report an Issue</h1>
        <p className="text-gray-600 text-sm mt-1 font-medium">Help your community by reporting local problems</p>
      </div>
      <ReportForm />
    </div>
  )
}
