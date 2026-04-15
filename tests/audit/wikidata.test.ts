import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchWikidataEntity } from '@/lib/audit/wikidata'

describe('searchWikidataEntity', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('returns the first match for a valid brand', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          search: [
            {
              id: 'Q42',
              label: 'Wyzlee',
              description: 'French tech company',
              concepturi: 'https://www.wikidata.org/wiki/Q42',
            },
          ],
        }),
        { status: 200 },
      ),
    ) as unknown as typeof fetch

    const result = await searchWikidataEntity('Wyzlee')
    expect(result).toEqual({
      id: 'Q42',
      label: 'Wyzlee',
      description: 'French tech company',
      url: 'https://www.wikidata.org/wiki/Q42',
    })
  })

  it('returns null when Wikidata has no match', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ search: [] }), { status: 200 }),
    ) as unknown as typeof fetch
    const result = await searchWikidataEntity('zzz-no-brand-xyz')
    expect(result).toBeNull()
  })

  it('returns null on HTTP error', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response('err', { status: 500 }),
    ) as unknown as typeof fetch
    const result = await searchWikidataEntity('Wyzlee')
    expect(result).toBeNull()
  })

  it('returns null on fetch exception', async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error('timeout')) as unknown as typeof fetch
    const result = await searchWikidataEntity('Wyzlee')
    expect(result).toBeNull()
  })

  it('short-circuits queries that are too short or too long', async () => {
    const spy = vi.fn()
    global.fetch = spy as unknown as typeof fetch
    expect(await searchWikidataEntity('a')).toBeNull()
    expect(await searchWikidataEntity('x'.repeat(200))).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })
})
