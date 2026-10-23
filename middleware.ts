import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user: any = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    user = null
  }

  const demoCookie = request.cookies.get('civic_demo_user')?.value
  if (!user && demoCookie) {
    try {
      user = JSON.parse(decodeURIComponent(demoCookie))
    } catch {
      user = { id: 'demo-citizen-id', role: 'citizen', email: 'citizen@demo.gov' }
    }
  }

  const { pathname } = request.nextUrl
  const host = request.headers.get('host') ?? ''
  const isPort3001 = host.includes(':3001') || request.nextUrl.port === '3001'
  const surface = process.env.NEXT_PUBLIC_APP_SURFACE || (isPort3001 ? 'admin' : 'citizen')

  // Allow static files and API routes without interference
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return response
  }

  function redirectWithCookies(target: URL | string) {
    const redirectRes = NextResponse.redirect(target)
    response.cookies.getAll().forEach((c) => {
      redirectRes.cookies.set(c.name, c.value, c)
    })
    return redirectRes
  }

  // Helper to fetch user role safely
  async function getUserRole(u: any): Promise<string> {
    if (u?.role && ['citizen', 'department', 'admin'].includes(u.role)) {
      return u.role
    }

    if (demoCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(demoCookie))
        if (parsed?.role && ['citizen', 'department', 'admin'].includes(parsed.role)) {
          return parsed.role
        }
      } catch {}
    }

    try {
      const { data: userData } = await supabase.from('users').select('role').eq('id', u.id).maybeSingle()
      if (userData?.role && ['citizen', 'department', 'admin'].includes(userData.role)) {
        return userData.role
      }
    } catch {}

    if (u?.user_metadata?.role && ['citizen', 'department', 'admin'].includes(u.user_metadata.role)) {
      return u.user_metadata.role
    }

    return 'citizen'
  }

  // 1. Port 3001 (Admin surface) strict redirect rules:
  if (surface === 'admin') {
    if (pathname === '/auth/login') {
      if (!user) {
        return redirectWithCookies(new URL('/auth/admin', request.url))
      }
    }
  }

  // 2. Root '/' route redirect based on port surface & auth state
  if (pathname === '/') {
    if (!user) {
      const targetLogin = surface === 'admin' ? '/auth/admin' : '/auth/login'
      return redirectWithCookies(new URL(targetLogin, request.url))
    }
    const role = await getUserRole(user)
    const targetRoute = getDefaultRoute(role, surface)
    if (targetRoute !== '/') {
      return redirectWithCookies(new URL(targetRoute, request.url))
    }
  }

  // 3. Auth pages handling (/auth/login, /auth/admin):
  if (pathname.startsWith('/auth')) {
    if (user && (pathname === '/auth/login' || pathname === '/auth/admin')) {
      const role = await getUserRole(user)
      const target = getDefaultRoute(role, surface)
      if (target !== pathname) {
        return redirectWithCookies(new URL(target, request.url))
      }
    }
    return response
  }

  // 4. Require authentication for protected routes
  if (!user) {
    const isExecutiveRoute =
      pathname.startsWith('/queue') ||
      pathname.startsWith('/overview') ||
      pathname.startsWith('/departments') ||
      pathname.startsWith('/analytics') ||
      pathname.startsWith('/reports/')

    const targetLogin = (isExecutiveRoute || surface === 'admin') ? '/auth/admin' : '/auth/login'
    return redirectWithCookies(new URL(targetLogin, request.url))
  }

  // 5. Fetch user role for access control
  const role = await getUserRole(user)

  // 6. Restrict Department detail pages (/reports/...) to Staff/Admin only
  if (pathname.startsWith('/reports/')) {
    if (role === 'citizen') {
      return redirectWithCookies(new URL('/my-reports', request.url))
    }
    return response
  }

  // 7. Route Scoping & Authorization
  const isCitizenRoute =
    pathname.startsWith('/report') ||
    pathname.startsWith('/my-reports') ||
    pathname.startsWith('/map')

  const isDeptRoute = pathname.startsWith('/queue')

  const isAdminRoute =
    pathname.startsWith('/overview') ||
    pathname.startsWith('/departments') ||
    pathname.startsWith('/analytics')

  // Citizen routes (/report, /my-reports, /map) are fully accessible to logged-in users on Citizen portal
  if (isCitizenRoute) {
    if (surface === 'admin' && role !== 'admin' && role !== 'department') {
      return redirectWithCookies(new URL('/auth/admin', request.url))
    }
    return response
  }

  // Redirect non-staff from department queue
  if (isDeptRoute && role !== 'department' && role !== 'admin') {
    const target = getDefaultRoute(role, surface)
    if (target !== pathname) {
      return redirectWithCookies(new URL(target, request.url))
    }
  }

  // Redirect non-admin from admin dashboard
  if (isAdminRoute && role !== 'admin') {
    const target = getDefaultRoute(role, surface)
    if (target !== pathname) {
      return redirectWithCookies(new URL(target, request.url))
    }
  }

  return response
}

function getDefaultRoute(role: string, surface?: string): string {
  if (surface === 'admin') {
    if (role === 'department') return '/queue'
    if (role === 'admin') return '/overview'
    return '/auth/admin'
  }
  if (surface === 'citizen') {
    return '/report'
  }
  switch (role) {
    case 'department':
      return '/queue'
    case 'admin':
      return '/overview'
    default:
      return '/report'
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
