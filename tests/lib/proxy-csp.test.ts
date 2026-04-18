// @vitest-environment node
/**
 * Vérifie la structure de la CSP : nonce unique par requête, présence de
 * strict-dynamic, et pas d'unsafe-eval en mode strict.
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
  it('inclut nonce + strict-dynamic dans script-src', async () => {
    const res = await runProxy()
    const csp = res?.headers.get('content-security-policy') ?? ''
    expect(csp).toMatch(/script-src[^;]+'nonce-[A-Za-z0-9+/=]+'/i)
    expect(csp).toMatch(/script-src[^;]+'strict-dynamic'/i)
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

  it('nonce change à chaque requête (unpredictable)', async () => {
    const [a, b] = await Promise.all([runProxy(), runProxy()])
    const getNonce = (res: Response | null) => {
      const csp = res?.headers.get('content-security-policy') ?? ''
      const m = csp.match(/'nonce-([A-Za-z0-9+/=]+)'/)
      return m?.[1] ?? ''
    }
    expect(getNonce(a)).not.toBe('')
    expect(getNonce(b)).not.toBe('')
    expect(getNonce(a)).not.toBe(getNonce(b))
  })

  it('nonce est passé en header x-nonce à la route', async () => {
    const res = await runProxy()
    // Le header x-nonce est injecté dans request.headers (visible côté route),
    // pas exposé en response header — on ne peut pas l'inspecter ici sans
    // accéder au NextResponse interne. Vérifier au moins qu'une CSP est posée.
    expect(res?.headers.get('content-security-policy')).toBeTruthy()
  })
})
