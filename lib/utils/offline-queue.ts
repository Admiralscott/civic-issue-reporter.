/**
 * Offline submission queue stored in localStorage.
 * Used by ReportForm when navigator.onLine === false.
 * Syncs automatically when the user comes back online.
 */

const QUEUE_KEY = 'civictrack_offline_queue'

export interface QueuedReport {
  id: string
  data: Record<string, unknown>
  timestamp: number
}

export function enqueueReport(data: Record<string, unknown>): string {
  const id = crypto.randomUUID()
  const queue = getQueue()
  queue.push({ id, data, timestamp: Date.now() })
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  return id
}

export function getQueue(): QueuedReport[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as QueuedReport[]
  } catch {
    return []
  }
}

export function dequeueReport(id: string): void {
  const queue = getQueue().filter((item) => item.id !== id)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function clearQueue(): void {
  localStorage.removeItem(QUEUE_KEY)
}

export async function flushQueue(
  submitFn: (data: Record<string, unknown>) => Promise<void>,
): Promise<{ synced: number; failed: number }> {
  const queue = getQueue()
  let synced = 0
  let failed = 0

  for (const item of queue) {
    try {
      await submitFn(item.data)
      dequeueReport(item.id)
      synced++
    } catch {
      failed++
    }
  }

  return { synced, failed }
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}
