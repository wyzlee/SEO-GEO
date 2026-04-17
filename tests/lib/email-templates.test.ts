import { describe, expect, it } from 'vitest'
import { auditCompletedEmail } from '@/lib/email/templates'

describe('auditCompletedEmail', () => {
  it('builds a subject with the client name and rounded score', () => {
    const { subject } = auditCompletedEmail({
      auditId: 'a-1',
      clientName: 'Acme',
      targetUrl: null,
      scoreTotal: 78.4,
      auditUrl: 'https://app/audits/a-1',
    })
    expect(subject).toBe('Audit terminé — Acme (78/100)')
  })

  it('falls back to the target URL when client name is missing', () => {
    const { subject } = auditCompletedEmail({
      auditId: 'a-1',
      clientName: null,
      targetUrl: 'https://example.com',
      scoreTotal: 62,
      auditUrl: 'https://app/audits/a-1',
    })
    expect(subject).toContain('https://example.com')
  })

  it('escapes HTML-unsafe values in subject body', () => {
    const { html } = auditCompletedEmail({
      auditId: 'a-1',
      clientName: 'Acme <script>alert(1)</script>',
      targetUrl: null,
      scoreTotal: 50,
      auditUrl: 'https://app/audits/a-1',
    })
    expect(html).not.toContain('<script>alert(1)')
    expect(html).toContain('&lt;script&gt;')
  })

  it('includes the share URL when provided', () => {
    const { html, text } = auditCompletedEmail({
      auditId: 'a-1',
      clientName: 'Acme',
      targetUrl: null,
      scoreTotal: 72,
      auditUrl: 'https://app/audits/a-1',
      shareUrl: 'https://app/r/abc123',
    })
    expect(html).toContain('abc123')
    expect(text).toContain('abc123')
  })

  it('greets the recipient by name when provided', () => {
    const { html } = auditCompletedEmail({
      auditId: 'a-1',
      clientName: 'Acme',
      targetUrl: null,
      scoreTotal: 50,
      auditUrl: 'https://app/audits/a-1',
      recipientName: 'Olivier',
    })
    expect(html).toContain('Bonjour Olivier')
  })

  it('uses the branding company name in footer', () => {
    const { html } = auditCompletedEmail({
      auditId: 'a-1',
      clientName: 'Acme',
      targetUrl: null,
      scoreTotal: 50,
      auditUrl: 'https://app/audits/a-1',
      companyName: 'Agence Exemple',
    })
    expect(html).toContain('Agence Exemple')
  })
})
