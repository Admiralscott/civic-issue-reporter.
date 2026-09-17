'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Loader2, CheckCircle, ArrowRight, UserCheck } from 'lucide-react'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'citizen' | 'department' | 'admin'>('citizen')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E5E7EB] p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md text-center border border-gray-100">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900">Check your email</h2>
          <p className="text-gray-500 mt-2 text-sm">We sent a confirmation link to <strong>{email}</strong></p>
          <div className="mt-6 flex flex-col gap-2">
            {role === 'citizen' ? (
              <Link href="/auth/login" className="bg-[#C4511E] text-white py-2.5 rounded-xl font-bold text-sm hover:bg-[#A83D0C] transition">
                Proceed to Citizen Login
              </Link>
            ) : (
              <Link href="/auth/admin" className="bg-slate-900 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition">
                Proceed to Executive Staff Login
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#E5E7EB] p-4 font-sans antialiased">
      
      {/* Top Banner */}
      <div className="w-full max-w-md mb-3 flex items-center justify-start px-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-white/90 px-3 py-1.5 rounded-full border border-gray-200 shadow-xs">
          <UserCheck className="w-3.5 h-3.5 text-[#C4511E]" />
          <span>Citizen Registration</span>
        </span>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200/80 flex flex-col min-h-[620px] relative">
        
        {/* Subtle Watermark Pattern */}
        <div className="absolute top-4 right-4 text-[42px] font-black text-gray-100 select-none pointer-events-none tracking-widest uppercase opacity-60">
          SIGNUP
        </div>

        <div className="px-8 pt-7 pb-6 flex-1 flex flex-col justify-between z-10">
          <div>
            {/* Header Title (Theme 1 style) */}
            <div className="text-center mt-2 mb-6">
              <h1 className="text-2xl font-extrabold tracking-wide text-gray-900 uppercase">
                CITIZEN
              </h1>
              <h2 className="text-xl font-bold tracking-wider text-gray-700 uppercase mt-0.5">
                SERVICE PORTAL
              </h2>
              <p className="text-xs text-gray-500 mt-1 font-medium">
                Create an account to start reporting & tracking issues
              </p>
            </div>

            <form onSubmit={handleSignup} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  required placeholder="Jane Doe"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#C4511E] focus:border-transparent outline-none transition text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  required placeholder="you@example.com"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#C4511E] focus:border-transparent outline-none transition text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Password</label>
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required minLength={6} placeholder="Min. 6 characters"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#C4511E] focus:border-transparent outline-none transition text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Account Role</label>
                <select
                  value={role} onChange={(e) => setRole(e.target.value as typeof role)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#C4511E] outline-none text-sm font-medium text-gray-800"
                >
                  <option value="citizen">Citizen — Report issues & track status</option>
                  <option value="department">Department Staff — Manage & resolve issues</option>
                  <option value="admin">Government Admin — City oversight portal</option>
                </select>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-xs font-medium">{error}</div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full bg-[#C4511E] hover:bg-[#A83D0C] text-white py-3 rounded-xl font-bold text-sm tracking-wide transition shadow-md active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? 'Creating Account…' : 'Create Account'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            <div className="mt-5 text-center flex justify-center gap-4 text-xs font-medium">
              <Link href="/auth/login" className="text-[#C4511E] font-bold hover:underline">
                Citizen Sign in
              </Link>
              <span className="text-gray-300">&bull;</span>
              <Link href="/auth/admin" className="text-blue-600 font-bold hover:underline">
                Executive Portal
              </Link>
            </div>
          </div>

          <div className="mt-4 text-center text-[10px] text-gray-400">
            Citizen Registration &bull; Civic Tracker
          </div>
        </div>

        {/* Cityscape Watermark Illustration Banner */}
        <div className="relative w-full h-24 bg-gradient-to-t from-[#C4511E]/10 to-transparent overflow-hidden pointer-events-none mt-auto">
          <svg className="absolute bottom-0 left-0 right-0 w-full h-20 text-gray-400/30" viewBox="0 0 500 150" preserveAspectRatio="none" fill="currentColor">
            <rect x="10" y="70" width="30" height="80" />
            <rect x="45" y="40" width="25" height="110" />
            <polygon points="45,40 57.5,20 70,40" />
            <rect x="75" y="90" width="40" height="60" />
            <rect x="120" y="55" width="35" height="95" />
            <rect x="160" y="80" width="25" height="70" />
            <rect x="190" y="30" width="45" height="120" />
            <polygon points="190,30 212.5,10 235,30" />
            <rect x="240" y="65" width="30" height="85" />
            <rect x="275" y="45" width="40" height="105" />
            <rect x="320" y="85" width="35" height="65" />
            <rect x="360" y="50" width="30" height="100" />
            <rect x="395" y="75" width="45" height="75" />
            <rect x="445" y="60" width="45" height="90" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/50 to-transparent"></div>
        </div>
      </div>
    </div>
  )
}

