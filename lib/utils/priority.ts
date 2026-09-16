import type { ReportCategory } from '@/lib/types'

const CATEGORY_BASE_WEIGHTS: Record<ReportCategory, number> = {
  emergency:   100,
  electrical:  70,
  water_leak:  60,
  road_damage: 50,
  garbage:     40,
  noise:       30,
  graffiti:    20,
  other:       10,
}

const HIGH_URGENCY_KEYWORDS = [
  'hazard', 'fire', 'spark', 'flood', 'blocked', 'danger',
  'accident', 'hospital', 'school', 'burst', 'electric', 'live wire', 'leak',
]

/**
 * Computes automated priority score based on:
 * 1. Base Category Urgency Weight (Emergency = 100, Electrical = 70, etc.)
 * 2. Community Upvote Impact (+10 pts per upvote)
 * 3. Text Keyword Urgency Detection (+25 pts if hazard/danger/school detected)
 * 4. Age Escalation Factor (+5 pts per day unresolved)
 */
export function computePriorityScore(report: {
  category: ReportCategory
  title: string
  description?: string | null
  upvote_count?: number
  created_at?: string | Date
}): number {
  // 1. Base Category Weight
  let score = CATEGORY_BASE_WEIGHTS[report.category] ?? 10

  // 2. Upvote Impact (+10 pts per upvote)
  const upvotes = report.upvote_count ?? 0
  score += upvotes * 10

  // 3. Keyword Detection (+25 pts)
  const text = `${report.title} ${report.description ?? ''}`.toLowerCase()
  const hasUrgentKeyword = HIGH_URGENCY_KEYWORDS.some((kw) => text.includes(kw))
  if (hasUrgentKeyword) {
    score += 25
  }

  // 4. Age Escalation Factor (+5 pts per day unresolved)
  if (report.created_at) {
    const createdDate = new Date(report.created_at)
    const daysOld = Math.max(0, (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
    score += Math.floor(daysOld * 5)
  }

  return Math.round(score)
}

export function getPriorityLevel(score: number): {
  label: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  color: string
  bg: string
} {
  if (score >= 100) {
    return { label: 'CRITICAL', color: 'text-red-700', bg: 'bg-red-100 border-red-200' }
  }
  if (score >= 60) {
    return { label: 'HIGH', color: 'text-orange-700', bg: 'bg-orange-100 border-orange-200' }
  }
  if (score >= 35) {
    return { label: 'MEDIUM', color: 'text-yellow-700', bg: 'bg-yellow-100 border-yellow-200' }
  }
  return { label: 'LOW', color: 'text-gray-700', bg: 'bg-gray-100 border-gray-200' }
}
