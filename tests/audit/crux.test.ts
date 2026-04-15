import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCruxMetrics } from '@/lib/audit/crux'

const CRUX_URL = 'https://example.com/'

describe('fetchCruxMetrics', () => {
  const originalKey = process.env.GOOGLE_CRUX_API_KEY
  const originalFetch = global.fetch

  beforeEach(() => {
    process.env.GOOGLE_CRUX_API_KEY = 'test-key'
  })

  afterEach(() => {
    process.env.GOOGLE_CRUX_API_KEY = originalKey
    global.fetch = originalFetch
  })

  it('returns null when no API key is configured', async () => {
    delete process.env.GOOGLE_CRUX_API_KEY
    const result = await fetchCruxMetrics(CRUX_URL)
    expect(result).toBeNull()
  })

  it('parses a valid CrUX response', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          record: {
            key: { url: CRUX_URL, formFactor: 'PHONE' },
            metrics: {
              largest_contentful_paint: { percentiles: { p75: 3200 } },
              interaction_to_next_paint: { percentiles: { p75: 180 } },
              cumulative_layout_shift: { percentiles: { p75: '0.08' } },
            },
            collectionPeriod: {
              firstDate: { year: 2026, month: 1, day: 1 },
              lastDate: { year: 2026, month: 1, day: 28 },
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ) as unknown as typeof fetch

    const result = await fetchCruxMetrics(CRUX_URL)
    expect(result).toEqual({
      lcpP75Ms: 3200,
      inpP75Ms: 180,
      clsP75: 0.08,
      formFactor: 'PHONE',
      collectionPeriod: {
        firstDate: '2026-01-01',
        lastDate: '2026-01-28',
      },
    })
  })

  it('returns null when the origin has no CrUX data (404)', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response('not found', { status: 404 }),
    ) as unknown as typeof fetch
    const result = await fetchCruxMetrics(CRUX_URL)
    expect(result).toBeNull()
  })

  it('returns null on network error', async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error('network down')) as unknown as typeof fetch
    const result = await fetchCruxMetrics(CRUX_URL)
    expect(result).toBeNull()
  })

  it('handles missing metrics gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ record: { key: { url: CRUX_URL } } }), {
        status: 200,
      }),
    ) as unknown as typeof fetch
    const result = await fetchCruxMetrics(CRUX_URL)
    expect(result).toMatchObject({
      lcpP75Ms: null,
      inpP75Ms: null,
      clsP75: null,
    })
  })
})
