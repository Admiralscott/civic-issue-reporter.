export function formatDistanceToNow(date: Date | string, options?: { addSuffix?: boolean }): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  let str = ''
  if (diffDay > 30) str = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  else if (diffDay > 0) str = `${diffDay}d`
  else if (diffHour > 0) str = `${diffHour}h`
  else if (diffMin > 0) str = `${diffMin}m`
  else str = `just now`

  if (options?.addSuffix && str !== 'just now' && !str.includes(',')) return `${str} ago`
  return str
}

export function format(date: Date | string, formatStr: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (formatStr === 'yyyy-MM-dd') return d.toISOString().split('T')[0]
  if (formatStr === 'MMM d') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (formatStr === 'MMM d, yyyy · h:mm a') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString()
}

export function subDays(date: Date, days: number): Date {
  const res = new Date(date)
  res.setDate(res.getDate() - days)
  return res
}
