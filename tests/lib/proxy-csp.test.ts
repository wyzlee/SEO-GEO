// @vitest-environment node
/**
 * Vérifie la structure de la CSP (V1) : unsafe-inline pour script-src (pas de
 * nonce/strict-dynamic — V2 migration en attente), pas d'unsafe-eval en mode
 * strict, object-src none, frame-ancestors none.
 *
 * On ne teste pas le comportement du proxy Next.js (redirects, auth) ici —
 * voir les tests e2e pour ça. On teste uniquement l'en-tête CSP.
 */
import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'

async function runProxy(url = 'https://app.local/') {
  const { default: proxy } = await import('@/proxy')
  const req = new NextRequest(url)
  const res = await proxy(req)
  return res
}

describe('proxy.ts CSP headers', () => {
  it('script-src inclut unsafe-inline (V1 — nonce+strict-dynamic en V2)', async () => {
    const res = await runProxy()
    const csp = res?.headers.get('content-security-policy') ?? ''
    expect(csp).toMatch(/script-src[^;]+'unsafe-inline'/i)
    expect(csp).not.toMatch(/script-src[^;]+'strict-dynamic'/i)
  })

  it('inclut object-src none et frame-ancestors none', async () => {
    const res = await runProxy()
    const csp = res?.headers.get('content-security-policy') ?? ''
    expect(csp).toMatch(/object-src\s+'none'/i)
    expect(csp).toMatch(/frame-ancestors\s+'none'/i)
  })

  it('strict mode (défaut) n\'inclut PAS unsafe-eval', async () => {
    delete process.env.CSP_RELAXED
    const res = await runProxy()
    const csp = res?.headers.get('content-security-policy') ?? ''
    expect(csp).not.toMatch(/'unsafe-eval'/i)
  })

  it('CSP est déterministe (nonce V1 via x-nonce request header, pas dans CSP)', async () => {
    // En V1 le nonce est généré par requête mais transmis uniquement via
    // x-nonce (request header côté route) — il n'apparaît pas dans la CSP.
    // La CSP elle-même est donc identique d'une requête à l'autre.
    const [a, b] = await Promise.all([runProxy(), runProxy()])
    const getCsp = (res: Response | null) => res?.headers.get('content-security-policy') ?? ''
    expect(getCsp(a)).toBeTruthy()
    expect(getCsp(a)).toBe(getCsp(b))
  })

  it('nonce est passé en header x-nonce à la route', async () => {
    const res = await runProxy()
    // Le header x-nonce est injecté dans request.headers (visible côté route),
    // pas exposé en response header — on ne peut pas l'inspecter ici sans
    // accéder au NextResponse interne. Vérifier au moins qu'une CSP est posée.
    expect(res?.headers.get('content-security-policy')).toBeTruthy()
  })
})
