import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js proxy (Wyzlee convention: proxy.ts instead of middleware.ts).
 * Responsibilities:
 * 1. Attach security headers + CSP nonce
 * 2. Gate protected routes behind a Stack Auth cookie
 * 3. Redirect authenticated users away from /login and marketing home
 */
export default async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https:;
    style-src 'self' 'unsafe-inline' https:;
    img-src 'self' blob: data: https:;
    font-src 'self' data: https:;
    connect-src 'self' https: wss:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, ' ')
    .trim()

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)

  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID
  const accessCookie =
    request.cookies.get(`stack-access-${projectId}`) ||
    request.cookies.get('stack-access')
  const refreshCookie =
    request.cookies.get(`stack-refresh-${projectId}`) ||
    request.cookies.get(`stack-refresh-${projectId}--default`)
  const isAuthenticated = !!(accessCookie?.value || refreshCookie?.value)

  const { pathname } = request.nextUrl

  const publicRoutes = [
    '/',
    '/login',
    '/auth/callback',
    '/auth/logout',
    '/r',
    '/api/health',
    '/api/webhooks',
  ]
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + '/'),
  )

  const isProtectedPath =
    !isPublicRoute &&
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/favicon.ico') &&
    !pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)

  if (isAuthenticated && pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  if (isProtectedPath && !isAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  if (isAuthenticated && pathname === '/login') {
    const redirectParam = request.nextUrl.searchParams.get('redirect')
    const url = request.nextUrl.clone()
    url.pathname = redirectParam || '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
