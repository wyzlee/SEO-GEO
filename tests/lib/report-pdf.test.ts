import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildPdfFilename } from '@/lib/report/pdf'
// renderPdf + PdfUnavailableError sont importés dynamiquement dans les tests
// ci-dessous via `await import(...)` après avoir posé les mocks
// `@sparticuz/chromium` / `puppeteer-core` via `vi.doMock()`.

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

describe('renderPdf (Puppeteer + @sparticuz/chromium)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.doUnmock('@sparticuz/chromium')
    vi.doUnmock('puppeteer-core')
  })

  it('throws PdfUnavailableError when puppeteer-core unavailable', async () => {
    vi.doMock('@sparticuz/chromium', () => {
      throw new Error('module not installed')
    })
    vi.doMock('puppeteer-core', () => {
      throw new Error('module not installed')
    })
    const { renderPdf: render, PdfUnavailableError: Err } = await import(
      '@/lib/report/pdf'
    )
    await expect(render({ html: '<p>hi</p>' })).rejects.toBeInstanceOf(Err)
  })

  it('renders Buffer via Puppeteer on success', async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x0a]) // "%PDF\n"
    const pageStub = {
      setContent: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue(undefined),
      pdf: vi.fn().mockResolvedValue(pdfBytes),
    }
    const browserStub = {
      newPage: vi.fn().mockResolvedValue(pageStub),
      close: vi.fn().mockResolvedValue(undefined),
    }
    vi.doMock('@sparticuz/chromium', () => ({
      default: {
        args: ['--no-sandbox'],
        executablePath: vi.fn().mockResolvedValue('/chromium'),
      },
    }))
    vi.doMock('puppeteer-core', () => ({
      default: { launch: vi.fn().mockResolvedValue(browserStub) },
    }))

    const { renderPdf: render } = await import('@/lib/report/pdf')
    const buf = await render({ html: '<h1>ok</h1>' })
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(buf.slice(0, 4).toString()).toBe('%PDF')
    expect(pageStub.setContent).toHaveBeenCalledWith(
      '<h1>ok</h1>',
      expect.objectContaining({ waitUntil: 'networkidle0' }),
    )
    expect(pageStub.pdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'A4', printBackground: true }),
    )
    expect(browserStub.close).toHaveBeenCalledTimes(1)
  })

  it('wraps Puppeteer launch errors in PdfUnavailableError', async () => {
    vi.doMock('@sparticuz/chromium', () => ({
      default: {
        args: [],
        executablePath: vi.fn().mockResolvedValue('/chromium'),
      },
    }))
    vi.doMock('puppeteer-core', () => ({
      default: { launch: vi.fn().mockRejectedValue(new Error('chrome fail')) },
    }))

    const { renderPdf: render, PdfUnavailableError: Err } = await import(
      '@/lib/report/pdf'
    )
    await expect(render({ html: '<p/>' })).rejects.toBeInstanceOf(Err)
  })

  it('closes browser even when page.pdf throws', async () => {
    const close = vi.fn().mockResolvedValue(undefined)
    const browserStub = {
      newPage: vi.fn().mockResolvedValue({
        setContent: vi.fn().mockResolvedValue(undefined),
        evaluate: vi.fn().mockResolvedValue(undefined),
        pdf: vi.fn().mockRejectedValue(new Error('render fail')),
      }),
      close,
    }
    vi.doMock('@sparticuz/chromium', () => ({
      default: { args: [], executablePath: vi.fn().mockResolvedValue('/x') },
    }))
    vi.doMock('puppeteer-core', () => ({
      default: { launch: vi.fn().mockResolvedValue(browserStub) },
    }))

    const { renderPdf: render, PdfUnavailableError: Err } = await import(
      '@/lib/report/pdf'
    )
    await expect(render({ html: '<p/>' })).rejects.toBeInstanceOf(Err)
    expect(close).toHaveBeenCalledTimes(1)
  })
})
