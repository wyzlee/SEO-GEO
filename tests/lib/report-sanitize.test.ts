// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  sanitizeReportHtml,
  sanitizeReportDocument,
} from '@/lib/report/sanitize'

const WRAP = (body: string) => `<!doctype html>
<html lang="fr"><head><title>t</title></head><body>${body}</body></html>`

describe('sanitizeReportHtml', () => {
  it('removes <script> tags', () => {
    const dirty = WRAP('<p>ok</p><script>alert(1)</script>')
    const clean = sanitizeReportHtml(dirty)
    expect(clean).not.toMatch(/<script/i)
    expect(clean).not.toMatch(/alert\(1\)/)
    expect(clean).toMatch(/<p>ok<\/p>/)
  })

  it('strips on* event handlers', () => {
    const dirty = WRAP('<img src="x" onerror="alert(1)">')
    const clean = sanitizeReportHtml(dirty)
    expect(clean).not.toMatch(/onerror/i)
    expect(clean).not.toMatch(/alert/)
  })

  it('blocks javascript: URLs in anchors', () => {
    const dirty = WRAP('<a href="javascript:alert(1)">click</a>')
    const clean = sanitizeReportHtml(dirty)
    expect(clean).not.toMatch(/javascript:/i)
  })

  it('blocks data: URLs except data:image/*', () => {
    const dirtyHtml = WRAP('<a href="data:text/html,<script>alert(1)</script>">x</a>')
    const clean = sanitizeReportHtml(dirtyHtml)
    expect(clean).not.toMatch(/data:text\/html/i)

    const imgOk = WRAP(
      '<img src="data:image/png;base64,iVBORw0KGgo=" alt="logo">',
    )
    const cleanImg = sanitizeReportHtml(imgOk)
    expect(cleanImg).toMatch(/data:image\/png/i)
  })

  it('removes <iframe>, <object>, <embed>, <form>', () => {
    const dirty = WRAP(
      '<iframe src="x"></iframe><object data="x"></object><form action="/x"><input></form>',
    )
    const clean = sanitizeReportHtml(dirty)
    expect(clean).not.toMatch(/<iframe/i)
    expect(clean).not.toMatch(/<object/i)
    expect(clean).not.toMatch(/<form/i)
    expect(clean).not.toMatch(/<input/i)
  })

  it('removes <meta http-equiv="refresh"> (redirect vector)', () => {
    const dirty = WRAP('<meta http-equiv="refresh" content="0;url=https://evil">')
    const clean = sanitizeReportHtml(dirty)
    expect(clean).not.toMatch(/http-equiv/i)
    expect(clean).not.toMatch(/evil/)
  })

  it('preserves <style> blocks (needed for self-contained report design)', () => {
    const dirty = WRAP('<style>.k{color:#4F46E5}</style><p class="k">hi</p>')
    const clean = sanitizeReportHtml(dirty)
    expect(clean).toMatch(/<style/i)
    expect(clean).toMatch(/#4F46E5/i)
  })

  it('preserves <link rel="stylesheet"> (Google Fonts)', () => {
    const dirty =
      '<!doctype html><html><head>' +
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">' +
      '</head><body></body></html>'
    const clean = sanitizeReportHtml(dirty)
    expect(clean).toMatch(/rel="stylesheet"/i)
    expect(clean).toMatch(/fonts\.googleapis\.com/)
  })

  it('preserves structural tags (h1-h6, tables, lists)', () => {
    const dirty = WRAP(
      '<h1>T</h1><h2>S</h2><table><tr><td>c</td></tr></table><ul><li>x</li></ul>',
    )
    const clean = sanitizeReportHtml(dirty)
    expect(clean).toMatch(/<h1>T<\/h1>/)
    expect(clean).toMatch(/<table/)
    expect(clean).toMatch(/<ul>/)
  })

  it('keeps inline style attribute', () => {
    const dirty = WRAP('<p style="color:red">x</p>')
    const clean = sanitizeReportHtml(dirty)
    expect(clean).toMatch(/style="color:\s*red"/i)
  })
})

describe('sanitizeReportDocument', () => {
  it('adds charset + viewport + noindex meta after sanitize', () => {
    const dirty = WRAP('<p>x</p>')
    const out = sanitizeReportDocument(dirty)
    expect(out).toMatch(/<meta charset="utf-8">/i)
    expect(out).toMatch(/viewport/)
    expect(out).toMatch(/noindex,\s*nofollow/)
  })

  it('still blocks scripts', () => {
    const dirty = WRAP('<p>x</p><script>alert("xss")</script>')
    const out = sanitizeReportDocument(dirty)
    expect(out).not.toMatch(/<script/i)
    expect(out).not.toMatch(/xss/)
  })

  it('handles XSS polyglot payloads', () => {
    const payloads = [
      '<svg/onload=alert(1)>',
      '<img src=x onerror=alert(1)>',
      '<body onload=alert(1)>',
      '"><script>alert(1)</script>',
      '<a href="jaVaScRiPt:alert(1)">x</a>',
      '<details open ontoggle=alert(1)>',
    ]
    // Handlers inline courants qui ne doivent JAMAIS subsister après sanitize.
    const forbidden = [
      /\sonload\s*=/i,
      /\sonerror\s*=/i,
      /\sonclick\s*=/i,
      /\sontoggle\s*=/i,
      /\sonmouse\w*\s*=/i,
      /\sonfocus\s*=/i,
    ]
    for (const p of payloads) {
      const out = sanitizeReportDocument(WRAP(p))
      expect(out, `payload: ${p}`).not.toMatch(/alert\(1\)/)
      for (const re of forbidden) {
        expect(out, `payload: ${p} matched ${re}`).not.toMatch(re)
      }
    }
  })
})
