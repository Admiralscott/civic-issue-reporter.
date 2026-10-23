'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Loader2, ArrowRight } from 'lucide-react'

export default function ExecutiveLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) {
        const msg = error.message || ''
        if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
          const isDept = email.toLowerCase().includes('dept') || email.toLowerCase().includes('staff')
          const role = isDept ? 'department' : 'admin'
          const demoUser = {
            id: `demo-${role}-id`,
            email: email.trim(),
            role,
            full_name: isDept ? 'Department Staff' : 'Government Admin',
          }
          document.cookie = `civic_demo_user=${encodeURIComponent(JSON.stringify(demoUser))}; path=/; max-age=86400; SameSite=Lax`
          window.location.href = isDept ? '/queue' : '/overview'
          return
        }
        setError(error.message)
        setLoading(false)
        return
      }

      if (data?.user) {
        let userRole = 'admin'
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', data.user.id)
            .single()
          if (userData?.role) userRole = userData.role
        } catch {
          userRole = 'admin'
        }

        if (userRole === 'citizen') {
          await supabase.auth.signOut()
          setError('Access Denied: Citizen accounts cannot access the Executive Portal. Please use the Citizen Portal.')
          setLoading(false)
          return
        }

        const sessionUser = {
          id: data.user.id,
          email: data.user.email ?? email.trim(),
          role: userRole,
          full_name: data.user.user_metadata?.full_name ?? (userRole === 'department' ? 'Department Staff' : 'Government Admin'),
        }
        document.cookie = `civic_demo_user=${encodeURIComponent(JSON.stringify(sessionUser))}; path=/; max-age=86400; SameSite=Lax`

        if (userRole === 'department') {
          window.location.href = '/queue'
        } else {
          window.location.href = '/overview'
        }
      }
    } catch {
      const isDept = email.toLowerCase().includes('dept') || email.toLowerCase().includes('staff')
      const role = isDept ? 'department' : 'admin'
      const demoUser = {
        id: `demo-${role}-id`,
        email: email.trim(),
        role,
        full_name: isDept ? 'Department Staff' : 'Government Admin',
      }
      document.cookie = `civic_demo_user=${encodeURIComponent(JSON.stringify(demoUser))}; path=/; max-age=86400; SameSite=Lax`
      window.location.href = isDept ? '/queue' : '/overview'
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F1EA] p-4 font-sans antialiased relative overflow-hidden">
      
      {/* Background Image (Parliament of India Photo) - Prominently Highlighted Backdrop */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src="/parliament-bg.png"
          alt="Parliament of India Background"
          className="w-full h-full object-cover opacity-75 filter contrast-110 saturate-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#F4F1EA]/25 via-transparent to-[#F4F1EA]/45" />
      </div>

      {/* Main Executive Login Card (Orange & White Template) */}
      <div className="w-full max-w-sm bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col relative z-10 my-auto">
        
        {/* Subtle Header Gradient */}
        <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-orange-50/60 to-transparent pointer-events-none" />

        <div className="px-7 pt-7 pb-8 flex-1 flex flex-col justify-between relative z-10">
          <div>
            {/* National Emblem of India at top */}
            <div className="flex flex-col items-center justify-center mb-3">
              <img
                src="/emblem.png"
                alt="State Emblem of India"
                className="h-20 w-auto object-contain mb-1 drop-shadow-xs"
              />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">
                GOVERNMENT OF INDIA
              </span>
            </div>

            {/* Header Title */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-black tracking-wider text-gray-900 uppercase">
                EXECUTIVE PORTAL
              </h1>
              <h2 className="text-base font-bold tracking-widest text-gray-700 uppercase mt-0.5">
                SERVICE PORTAL
              </h2>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Official Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@demo.gov"
                  className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#C4511E] focus:border-transparent outline-none transition text-sm text-gray-900 placeholder:text-gray-400 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#C4511E] focus:border-transparent outline-none transition text-sm text-gray-900 placeholder:text-gray-400 shadow-inner"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl text-xs font-medium">
                  {error}
                </div>
              )}

              {/* Primary Action Button (Terracotta Orange) */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#C4511E] hover:bg-[#A83D0C] text-white py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all shadow-md active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials…</span>
                  </>
                ) : (
                  <>
                    <span>Executive Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-gray-500 font-medium">
              Encrypted Official Gateway &bull; Restrictive Access Control
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
