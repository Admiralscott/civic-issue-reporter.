'use client'

import Link from 'next/link'
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
} from 'lucide-react'

interface NavProps {
  theme?: 'blue' | 'orange' | 'purple'
}

const THEME_CLASSES = {
  blue: {
    bar: 'bg-blue-600 text-white',
    active: 'bg-blue-700 text-white',
    hover: 'hover:bg-blue-500/50 text-blue-50',
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
    { href: '/my-reports', label: 'My Reports',   icon: FileText },
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

export default function Navigation({ theme = 'blue' }: NavProps) {
  const pathname = usePathname()
  const router = useRouter()

  const role = theme === 'purple' ? 'admin' : theme === 'orange' ? 'department' : 'citizen'
  const links = LINKS[role] ?? LINKS.citizen
  const t = THEME_CLASSES[theme] ?? THEME_CLASSES.blue

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <nav className={cn('shadow-md', t.bar)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <LogoIcon className="w-5 h-5" />
              <span>CivicTrack</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition',
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
            <button
              onClick={handleLogout}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition',
                t.hover
              )}
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-white/10">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs font-medium transition',
                pathname === href ? t.active : t.hover
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
