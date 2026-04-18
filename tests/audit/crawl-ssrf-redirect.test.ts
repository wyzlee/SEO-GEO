// @vitest-environment node
/**
 * Vérifie que le crawler re-valide chaque Location lors d'un redirect HTTP.
 * Cible : bloquer le vecteur SSRF "URL publique → 301 → IP privée / metadata".
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('crawl fetchWithTimeout — validation SSRF sur redirect', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('bloque une redirection vers 127.0.0.1', async () => {
    const fetchStub = vi
      .fn()
      // Premier hop : 301 Location: http://127.0.0.1/
      .mockResolvedValueOnce(
        new Response('', {
          status: 301,
          headers: { Location: 'http://127.0.0.1:3000/' },
        }),
      )
    vi.stubGlobal('fetch', fetchStub)

    const { fetchText } = await import('@/lib/audit/crawl')
    // fetchText catch les erreurs et retourne null sur échec (pas de throw).
    const result = await fetchText('https://example.com/')
    expect(result).toBeNull()
    // Pas d'appel fetch vers 127.0.0.1 — la validation bloque avant.
    expect(fetchStub).toHaveBeenCalledTimes(1)
    expect(fetchStub.mock.calls[0][0]).toBe('https://example.com/')
  })

  it('bloque une redirection vers 169.254.169.254 (AWS metadata)', async () => {
    const fetchStub = vi.fn().mockResolvedValueOnce(
      new Response('', {
        status: 302,
        headers: { Location: 'http://169.254.169.254/latest/meta-data/' },
      }),
    )
    vi.stubGlobal('fetch', fetchStub)

    const { fetchText } = await import('@/lib/audit/crawl')
    const result = await fetchText('https://public.example/')
    expect(result).toBeNull()
    expect(fetchStub).toHaveBeenCalledTimes(1)
  })

  it('bloque une redirection vers 10.0.0.1 (RFC1918)', async () => {
    const fetchStub = vi.fn().mockResolvedValueOnce(
      new Response('', {
        status: 307,
        headers: { Location: 'http://10.0.0.1/admin' },
      }),
    )
    vi.stubGlobal('fetch', fetchStub)

    const { fetchText } = await import('@/lib/audit/crawl')
    expect(await fetchText('https://ok.example/')).toBeNull()
    expect(fetchStub).toHaveBeenCalledTimes(1)
  })

  it('suit une redirection vers une URL publique (301 → autre host public)', async () => {
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('', {
          status: 301,
          headers: { Location: 'https://www.example.org/new-path' },
        }),
      )
      .mockResolvedValueOnce(new Response('<p>hello</p>', { status: 200 }))
    vi.stubGlobal('fetch', fetchStub)

    const { fetchText } = await import('@/lib/audit/crawl')
    const body = await fetchText('https://example.org/old-path')
    expect(body).toBe('<p>hello</p>')
    expect(fetchStub).toHaveBeenCalledTimes(2)
  })

  it('limite à 5 redirections max (évite boucle infinie)', async () => {
    const fetchStub = vi.fn()
    // Chain infinie de 301 vers example.com/next
    for (let i = 0; i < 10; i += 1) {
      fetchStub.mockResolvedValueOnce(
        new Response('', {
          status: 301,
          headers: { Location: `https://example.com/hop-${i + 1}` },
        }),
      )
    }
    vi.stubGlobal('fetch', fetchStub)

    const { fetchText } = await import('@/lib/audit/crawl')
    const result = await fetchText('https://example.com/hop-0')
    expect(result).toBeNull()
    // Max 6 appels (hop 0, puis 5 redirects validés, puis throw au 6ème).
    expect(fetchStub.mock.calls.length).toBeLessThanOrEqual(6)
  })

  it('résout correctement une Location relative (301 Location: /other)', async () => {
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('', {
          status: 302,
          headers: { Location: '/new-location' },
        }),
      )
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', fetchStub)

    const { fetchText } = await import('@/lib/audit/crawl')
    await fetchText('https://example.com/old')
    expect(fetchStub.mock.calls[1][0]).toBe('https://example.com/new-location')
  })
})
