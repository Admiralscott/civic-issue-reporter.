import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/auth') || pathname.startsWith('/api')) return response

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = userData?.role ?? 'citizen'
  const surface = process.env.NEXT_PUBLIC_APP_SURFACE

  if (surface === 'citizen' && role !== 'citizen') {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (surface === 'admin' && role === 'citizen') {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  const isCitizenRoute =
    pathname.startsWith('/report') ||
    pathname.startsWith('/my-reports') ||
    pathname.startsWith('/map')

  const isDeptRoute = pathname.startsWith('/queue')
  const isReportDetailRoute = pathname.startsWith('/reports/')
  const isAdminRoute =
    pathname.startsWith('/overview') ||
    pathname.startsWith('/departments') ||
    pathname.startsWith('/analytics')

  if (isReportDetailRoute && role !== 'department' && role !== 'admin') {
    return NextResponse.redirect(new URL(getDefaultRoute(role), request.url))
  }

  if (isDeptRoute && role !== 'department' && role !== 'admin') {
    return NextResponse.redirect(new URL(getDefaultRoute(role), request.url))
  }

  if (isCitizenRoute && role !== 'citizen') {
    return NextResponse.redirect(new URL(getDefaultRoute(role), request.url))
  }

  if (isAdminRoute && role !== 'admin') {
    return NextResponse.redirect(new URL(getDefaultRoute(role), request.url))
  }

  if (pathname === '/') {
    return NextResponse.redirect(new URL(getDefaultRoute(role), request.url))
  }

  return response
}

function getDefaultRoute(role: string): string {
  const surface = process.env.NEXT_PUBLIC_APP_SURFACE
  if (surface === 'citizen') return '/report'
  if (surface === 'admin') return role === 'department' ? '/queue' : '/overview'

  switch (role) {
    case 'department': return '/queue'
    case 'admin': return '/overview'
    default: return '/report'
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
