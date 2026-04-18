import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js proxy (Wyzlee convention: proxy.ts instead of middleware.ts).
 * Responsibilities:
 * 1. Attach security headers + CSP nonce
 * 2. Gate protected routes behind a Stack Auth cookie
 * 3. Redirect authenticated users away from /login and marketing home
 *
 * CSP — état actuel :
 *  - `'unsafe-eval'` retiré de script-src (aucun code app ne l'utilise).
 *  - `'unsafe-inline'` maintenu pour style-src (Tailwind v4 + React inline
 *    styles) et script-src (Next.js hydration + Stack Auth inline snippets).
 *  - Nonce exposé via `x-nonce` header, prêt pour la migration V2
 *    (strict-dynamic + nonces dans layout). NOTE : sans `'strict-dynamic'`,
 *    `'unsafe-inline'` prime — le nonce est inerte mais sans risque.
 *  - Bypass d'urgence : `CSP_RELAXED=1` en env ajoute `'unsafe-eval'`
 *    (rollback sans rebuild).
 */
export default async function proxy(request: NextRequest) {
  // Nonce par requête — prêt pour la migration V2 vers strict-dynamic.
  // Consommé via `headers().get('x-nonce')` dans les Server Components.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  const strictCsp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'unsafe-inline' https:;
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
    script-src 'self' 'nonce-${nonce}' 'unsafe-eval' 'unsafe-inline' https:;
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

  const orgCookie = request.cookies.get('seo-geo-org')?.value
  if (orgCookie && request.nextUrl.pathname.startsWith('/api/')) {
    requestHeaders.set('x-org-id', orgCookie)
  }

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
    '/invite',
    '/legal',
    '/blog',
    '/api/health',
    '/api/webhooks',
    '/api/invitations',
  ]
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + '/'),
  )

  const mainHost = process.env.NEXT_PUBLIC_APP_HOST || 'seo-geo-orcin.vercel.app'
  const requestHost = request.headers.get('host') || ''
  // Exclure localhost et toutes les URLs Vercel (.vercel.app) pour ne pas
  // bloquer les preview deployments sur les branches feature.
  const isCustomDomain =
    requestHost !== '' &&
    requestHost !== mainHost &&
    !requestHost.startsWith('localhost') &&
    !requestHost.endsWith('.vercel.app')

  if (isCustomDomain) {
    if (!pathname.startsWith('/r/') && pathname !== '/r') {
      const url = request.nextUrl.clone()
      url.host = mainHost
      url.protocol = 'https:'
      return NextResponse.redirect(url)
    }
    return response
  }

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
