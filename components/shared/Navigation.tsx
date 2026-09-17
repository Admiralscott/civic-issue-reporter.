'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import {
  PlusCircle,
  FileText,
  MapPin,
  Inbox,
  LayoutDashboard,
  Building2,
  BarChart3,
  LogOut,
  MapPin as LogoIcon,
  Search,
  Plus,
} from 'lucide-react'
import NotificationBell from '@/components/citizen/NotificationBell'

interface NavProps {
  theme?: 'blue' | 'orange' | 'purple' | 'terracotta'
}

const THEME_CLASSES = {
  terracotta: {
    bar: 'bg-gradient-to-r from-[#B33D08] via-[#C4511E] to-[#D85D27] text-white shadow-md',
    active: 'bg-[#932F06] text-white font-bold',
    hover: 'hover:bg-[#A83D0C] text-white/90',
    logo: 'text-white',
  },
  blue: {
    bar: 'bg-gradient-to-r from-[#B33D08] via-[#C4511E] to-[#D85D27] text-white shadow-md',
    active: 'bg-[#932F06] text-white font-bold',
    hover: 'hover:bg-[#A83D0C] text-white/90',
    logo: 'text-white',
  },
  orange: {
    bar: 'bg-orange-600 text-white',
    active: 'bg-orange-700 text-white',
    hover: 'hover:bg-orange-500/50 text-orange-50',
    logo: 'text-white',
  },
  purple: {
    bar: 'bg-purple-700 text-white',
    active: 'bg-purple-800 text-white',
    hover: 'hover:bg-purple-600/50 text-purple-50',
    logo: 'text-white',
  },
}

const LINKS = {
  citizen: [
    { href: '/report',     label: 'Report Issue', icon: PlusCircle },
    { href: '/my-reports', label: 'My Requests',  icon: FileText },
    { href: '/map',        label: 'Map',          icon: MapPin },
  ],
  department: [
    { href: '/queue',      label: 'Report Queue', icon: Inbox },
  ],
  admin: [
    { href: '/overview',    label: 'Overview',    icon: LayoutDashboard },
    { href: '/departments', label: 'Departments', icon: Building2 },
    { href: '/analytics',   label: 'Analytics',   icon: BarChart3 },
  ],
}

export default function Navigation({ theme = 'terracotta' }: NavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

  const role = theme === 'purple' ? 'admin' : theme === 'orange' ? 'department' : 'citizen'
  const links = LINKS[role] ?? LINKS.citizen
  const isCitizen = role === 'citizen'
  const t = THEME_CLASSES[theme] ?? THEME_CLASSES.terracotta

  useEffect(() => {
    if (isCitizen) {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data }) => {
        setUserId(data.user?.id ?? null)
      })
    }
  }, [isCitizen])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(isCitizen ? '/auth/login' : '/auth/admin')
  }

  return (
    <>
      <nav className={cn('sticky top-0 z-40 shadow-md', t.bar)}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4 flex-1">
              <Link href="/" className="flex items-center gap-2 font-black tracking-wide text-lg text-white uppercase">
                <LogoIcon className="w-5 h-5 text-amber-200" />
                <span>CIVIC SERVICE</span>
              </Link>

              {/* Theme 3 Header Search Bar for Citizen PWA */}
              {isCitizen && (
                <div className="relative flex-1 max-w-sm hidden sm:flex items-center ml-4">
                  <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search for services or reports..."
                    className="w-full pl-9 pr-4 py-1.5 text-xs rounded-full bg-white/95 text-gray-900 border-none outline-none shadow-inner placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-[#C4511E]"
                  />
                </div>
              )}

              {/* Desktop Nav Links */}
              <div className="hidden md:flex items-center gap-1 ml-4">
                {links.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition',
                      pathname === href ? t.active : t.hover
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isCitizen && userId && (
                <NotificationBell userId={userId} />
              )}
              <button
                onClick={handleLogout}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition',
                  t.hover
                )}
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Theme 3 PWA Mobile Bottom Navigation Bar (Citizen Only) */}
      {isCitizen && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 py-1 px-4 shadow-2xl flex items-center justify-around max-w-lg mx-auto sm:rounded-t-2xl md:hidden">
          {/* 1. Home / Report */}
          <Link
            href="/report"
            className={cn(
              'flex flex-col items-center gap-0.5 py-1 px-2 text-[10px] font-bold transition',
              pathname === '/report' ? 'text-[#C4511E]' : 'text-gray-500 hover:text-gray-900'
            )}
          >
            <PlusCircle className="w-5 h-5" />
            <span>Home</span>
          </Link>

          {/* 2. My Requests */}
          <Link
            href="/my-reports"
            className={cn(
              'flex flex-col items-center gap-0.5 py-1 px-2 text-[10px] font-bold transition',
              pathname === '/my-reports' ? 'text-[#C4511E]' : 'text-gray-500 hover:text-gray-900'
            )}
          >
            <FileText className="w-5 h-5" />
            <span>My Requests</span>
          </Link>

          {/* 3. Center Prominent Floating + Post Button (Theme 3 signature element) */}
          <Link
            href="/report"
            className="flex flex-col items-center -mt-6 group"
            title="Post New Report"
          >
            <div className="w-12 h-12 rounded-full bg-[#C4511E] text-white flex items-center justify-center shadow-lg border-4 border-white group-hover:bg-[#A83D0C] group-active:scale-95 transition-all">
              <Plus className="w-6 h-6 stroke-[3]" />
            </div>
            <span className="text-[10px] font-extrabold text-[#C4511E] mt-0.5">Post</span>
          </Link>

          {/* 4. Map */}
          <Link
            href="/map"
            className={cn(
              'flex flex-col items-center gap-0.5 py-1 px-2 text-[10px] font-bold transition',
              pathname === '/map' ? 'text-[#C4511E]' : 'text-gray-500 hover:text-gray-900'
            )}
          >
            <MapPin className="w-5 h-5" />
            <span>Map</span>
          </Link>

          {/* 5. Logout */}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-0.5 py-1 px-2 text-[10px] font-bold text-gray-500 hover:text-gray-900 transition"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </>
  )
}

