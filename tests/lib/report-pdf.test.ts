import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PdfUnavailableError,
  buildPdfFilename,
  renderPdf,
} from '@/lib/report/pdf'

const ORIGINAL_ENV = { ...process.env }

describe('buildPdfFilename', () => {
  it('uses clientName when present', () => {
    const name = buildPdfFilename(
      { id: 'abc123', clientName: 'Acme SEO', targetUrl: null },
      new Date('2026-04-15T10:00:00Z'),
    )
    expect(name).toBe('audit-seo-geo-acme-seo-2026-04-15.pdf')
  })

  it('falls back to hostname of targetUrl', () => {
    const name = buildPdfFilename(
      { id: 'abc123', clientName: null, targetUrl: 'https://www.example.com/page' },
      new Date('2026-04-15T10:00:00Z'),
    )
    expect(name).toBe('audit-seo-geo-www-example-com-2026-04-15.pdf')
  })

  it('falls back to id slice when nothing else', () => {
    const name = buildPdfFilename(
      { id: 'abcdef123456', clientName: null, targetUrl: null },
      new Date('2026-04-15T10:00:00Z'),
    )
    expect(name).toBe('audit-seo-geo-abcdef12-2026-04-15.pdf')
  })

  it('strips accents and non-word characters', () => {
    const name = buildPdfFilename(
      { id: 'x', clientName: 'Société Éclair & Cie — Sarl', targetUrl: null },
      new Date('2026-04-15T10:00:00Z'),
    )
    expect(name).toBe('audit-seo-geo-societe-eclair-cie-sarl-2026-04-15.pdf')
  })
})

describe('renderPdf', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env = { ...ORIGINAL_ENV }
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('throws PdfUnavailableError when GOTENBERG_URL missing', async () => {
    delete process.env.GOTENBERG_URL
    await expect(renderPdf({ html: '<p>hi</p>' })).rejects.toBeInstanceOf(
      PdfUnavailableError,
    )
  })

  it('POSTs to gotenberg and returns a Buffer on success', async () => {
    process.env.GOTENBERG_URL = 'http://gotenberg:3000'
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]) // "%PDF"
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(pdfBytes, { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const buf = await renderPdf({ html: '<h1>ok</h1>' })
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(buf.slice(0, 4).toString()).toBe('%PDF')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://gotenberg:3000/forms/chromium/convert/html')
    expect((init as { method: string }).method).toBe('POST')
  })

  it('throws PdfUnavailableError on non-2xx response', async () => {
    process.env.GOTENBERG_URL = 'http://gotenberg:3000'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('boom', { status: 500 }),
      ),
    )
    await expect(renderPdf({ html: '<h1>x</h1>' })).rejects.toBeInstanceOf(
      PdfUnavailableError,
    )
  })

  it('throws PdfUnavailableError when fetch itself fails', async () => {
    process.env.GOTENBERG_URL = 'http://gotenberg:3000'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(
        Object.assign(new Error('fetch failed'), { name: 'TypeError' }),
      ),
    )
    await expect(renderPdf({ html: '<h1>x</h1>' })).rejects.toBeInstanceOf(
      PdfUnavailableError,
    )
  })
})
