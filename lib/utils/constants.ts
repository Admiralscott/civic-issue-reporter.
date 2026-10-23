import type { ReportCategory } from '@/lib/types'

/** Canonical emoji map for report categories — single source of truth */
export const CATEGORY_EMOJI: Record<string, string> = {
  road_damage: '🛣️',
  water_leak: '💧',
  electrical: '⚡',
  garbage: '🗑️',
  graffiti: '🎨',
  noise: '📢',
  emergency: '🚨',
  other: '📋',
}

/** Mapping from category → department ID */
export const CATEGORY_DEPT_ID: Record<ReportCategory, string> = {
  water_leak: 'dept-water',
  garbage: 'dept-sanitation',
  graffiti: 'dept-sanitation',
  noise: 'dept-sanitation',
  road_damage: 'dept-roads',
  electrical: 'dept-electrical',
  emergency: 'dept-control',
  other: 'dept-control',
}

/** Mapping from category → department display name */
export const CATEGORY_DEPT_NAME: Record<ReportCategory, string> = {
  water_leak: 'Water Supply & Sewage',
  garbage: 'Sanitation & Solid Waste',
  graffiti: 'Sanitation & Solid Waste',
  noise: 'Sanitation & Solid Waste',
  road_damage: 'Public Works & Roads',
  electrical: 'Electrical & Lighting',
  emergency: 'Municipal Control Center',
  other: 'Municipal Control Center',
}

/** Format a snake_case string to Title Case (replaces ALL underscores) */
export function formatSnakeCase(value: string): string {
  return value.replace(/_/g, ' ')
}
