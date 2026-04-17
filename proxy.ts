import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js proxy (Wyzlee convention: proxy.ts instead of middleware.ts).
 * Responsibilities:
 * 1. Attach security headers + CSP nonce
 * 2. Gate protected routes behind a Stack Auth cookie
 * 3. Redirect authenticated users away from /login and marketing home
 *
 * CSP — état Vague 2.2 :
 *  - `'unsafe-eval'` retiré de script-src (low-risk, aucun code app ne
 *    l'utilise ; les lib modernes n'en ont plus besoin).
 *  - `'unsafe-inline'` maintenu pour style-src (Tailwind v4 + React
 *    inline styles) et script-src (Stack Auth inline snippets). Migration
 *    vers strict-dynamic + nonces planifiée V2 (nonce est déjà exposé via
 *    `x-nonce` header, prêt à l'emploi côté Next.js runtime).
 *  - Bypass d'urgence : `CSP_RELAXED=1` en env pour réactiver le CSP
 *    historique sans redéploiement (rollback sans rebuild).
 */
export default async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  const strictCsp = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' https:;
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

  const relaxedCsp = `
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

  const csp = process.env.CSP_RELAXED === '1' ? relaxedCsp : strictCsp

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
    '/legal',
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
