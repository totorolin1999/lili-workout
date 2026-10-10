import createMiddleware from 'next-intl/middleware'
import { routing } from './src/i18n/routing'
import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from './src/lib/supabase/middleware'

const intlMiddleware = createMiddleware(routing)

export async function proxy(request: NextRequest) {
  // Skip static files and API routes
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    /\.(ico|png|jpg|jpeg|svg|webp|gif|woff|woff2|ttf|css|js)$/i.test(pathname)
  ) {
    return NextResponse.next()
  }

  // Update Supabase session
  const sessionResponse = await updateSession(request)
  if (sessionResponse.status !== 200) {
    return sessionResponse
  }

  // Apply next-intl locale routing
  return intlMiddleware(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
