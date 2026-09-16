// ─── Domain Types ──────────────────────────────────────────────────────────

export type UserRole = 'citizen' | 'department' | 'admin'

export type ReportStatus =
  | 'pending'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | 'reopened'

export type ReportCategory =
  | 'road_damage'
  | 'water_leak'
  | 'electrical'
  | 'garbage'
  | 'graffiti'
  | 'noise'
  | 'emergency'
  | 'other'

export interface User {
  id: string
  full_name: string | null
  phone: string | null
  role: UserRole
  department_id: string | null
  created_at: string
}

export interface Department {
  id: string
  name: string
  description: string | null
  email: string | null
  categories: ReportCategory[]
  zone: string | null
  created_at: string
}

export interface Report {
  id: string
  citizen_id: string | null
  title: string
  description: string | null
  category: ReportCategory
  status: ReportStatus
  priority_score: number
  location: any
  address: string | null
  assigned_dept_id: string | null
  photo_urls: string[] | null
  resolution_photo_url: string | null
  upvote_count: number
  created_at: string
  updated_at: string
  resolved_at: string | null
}

export interface StatusHistory {
  id: string
  report_id: string
  changed_by: string | null
  old_status: ReportStatus | null
  new_status: ReportStatus
  note: string | null
  created_at: string
}

export interface ReportUpvote {
  id: string
  report_id: string
  citizen_id: string
  created_at: string
}

// ─── Supabase Database Generic ────────────────────────────────────────────

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Partial<User>
        Update: Partial<User>
        Relationships: any[]
      }
      departments: {
        Row: Department
        Insert: Partial<Department>
        Update: Partial<Department>
        Relationships: any[]
      }
      reports: {
        Row: Report
        Insert: Partial<Report>
        Update: Partial<Report>
        Relationships: any[]
      }
      status_history: {
        Row: StatusHistory
        Insert: Partial<StatusHistory>
        Update: Partial<StatusHistory>
        Relationships: any[]
      }
      report_upvotes: {
        Row: ReportUpvote
        Insert: Partial<ReportUpvote>
        Update: Partial<ReportUpvote>
        Relationships: any[]
      }
    }
    Views: Record<string, any>
    Functions: Record<string, any>
  }
}
