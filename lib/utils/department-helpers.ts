import type { Department, Report, ReportCategory, ReportStatus } from '@/lib/types'

export const CONFIGURED_DEPARTMENTS: Department[] = [
  {
    id: 'a11349e6-75f9-4787-9805-529bcd3a65ab',
    name: 'Water & Utilities',
    description: 'Water leaks, drainage, electrical',
    email: 'water@city.gov',
    categories: ['water_leak', 'electrical'],
    zone: 'city-wide',
    created_at: '2026-09-15T06:44:14.90217+00:00',
  },
  {
    id: '4c021fbc-a68c-4fe0-be25-22453f443d90',
    name: 'Sanitation',
    description: 'Garbage, dumping, graffiti',
    email: 'sanitation@city.gov',
    categories: ['garbage', 'graffiti'],
    zone: 'city-wide',
    created_at: '2026-09-15T06:44:14.90217+00:00',
  },
  {
    id: '486112af-ac9a-4e20-b9dc-6f77e6dac235',
    name: 'Public Safety',
    description: 'Emergencies, noise',
    email: 'safety@city.gov',
    categories: ['emergency', 'noise', 'other'],
    zone: 'city-wide',
    created_at: '2026-09-15T06:44:14.90217+00:00',
  },
  {
    id: 'a0241d48-0fe8-4e3f-aceb-16a65dea7d9b',
    name: 'Road & Infra',
    description: 'Road damage, potholes',
    email: 'roads@city.gov',
    categories: ['road_damage'],
    zone: 'city-wide',
    created_at: '2026-09-15T06:44:14.90217+00:00',
  },
]

/**
 * Legacy/Mock ID to actual configured department mapping
 */
const LEGACY_DEPT_MAP: Record<string, string> = {
  'dept-water': 'a11349e6-75f9-4787-9805-529bcd3a65ab',
  'dept-electrical': 'a11349e6-75f9-4787-9805-529bcd3a65ab',
  'dept-sanitation': '4c021fbc-a68c-4fe0-be25-22453f443d90',
  'dept-control': '486112af-ac9a-4e20-b9dc-6f77e6dac235',
  'dept-roads': 'a0241d48-0fe8-4e3f-aceb-16a65dea7d9b',
}

/**
 * Checks whether a given civic report belongs to a specific department.
 * Uses exact assigned_dept_id, legacy ID alias, department name match, or category match.
 */
export function isReportInDepartment(report: Report & { departments?: { name: string } | null }, dept: Department): boolean {
  if (report.assigned_dept_id === dept.id) {
    return true
  }

  // Check legacy department ID alias
  if (report.assigned_dept_id && LEGACY_DEPT_MAP[report.assigned_dept_id] === dept.id) {
    return true
  }

  // Check department name match
  if (report.departments?.name && report.departments.name.toLowerCase() === dept.name.toLowerCase()) {
    return true
  }

  // Fallback: If no explicit assigned_dept_id, or unmapped ID, check if category belongs to this department
  if (!report.assigned_dept_id || !CONFIGURED_DEPARTMENTS.some(d => d.id === report.assigned_dept_id)) {
    if (dept.categories && dept.categories.includes(report.category)) {
      return true
    }
  }

  return false
}

export interface DepartmentStats {
  pending: number
  active: number
  fixed: number
  total: number
}

/**
 * Calculates live Pending, Active, and Fixed counters for a department based on actual reports.
 */
export function calculateDepartmentStats(dept: Department, reports: (Report & { departments?: { name: string } | null })[]): DepartmentStats {
  const deptReports = reports.filter((r) => isReportInDepartment(r, dept))
  return {
    pending: deptReports.filter((r) => r.status === 'pending').length,
    active: deptReports.filter((r) => r.status === 'in_progress' || r.status === 'acknowledged' || r.status === 'reopened').length,
    fixed: deptReports.filter((r) => r.status === 'resolved' || r.status === 'closed').length,
    total: deptReports.length,
  }
}
