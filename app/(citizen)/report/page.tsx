import type { Metadata } from 'next'
import ReportForm from '@/components/citizen/ReportForm'

export const metadata: Metadata = { title: 'Report an Issue' }

export default function ReportPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Report an Issue</h1>
        <p className="text-gray-500 text-sm mt-1">Help your community by reporting local problems</p>
      </div>
      <ReportForm />
    </div>
  )
}
