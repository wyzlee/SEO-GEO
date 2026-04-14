import { describe, expect, it } from 'vitest'
import { createAuditSchema } from '@/lib/types'

const orgId = '7d2f3a6e-4c91-4b1f-8a03-1e9d8f4c5b7a'

describe('createAuditSchema', () => {
  it('accepts a valid URL audit payload', () => {
    const result = createAuditSchema.safeParse({
      inputType: 'url',
      targetUrl: 'https://example.com',
      organizationId: orgId,
    })
    expect(result.success).toBe(true)
  })

  it('rejects a URL audit without target_url', () => {
    const result = createAuditSchema.safeParse({
      inputType: 'url',
      organizationId: orgId,
    })
    expect(result.success).toBe(false)
  })

  it('rejects a github audit with malformed repo', () => {
    const result = createAuditSchema.safeParse({
      inputType: 'github',
      githubRepo: 'not a repo',
      organizationId: orgId,
    })
    expect(result.success).toBe(false)
  })

  it('defaults mode to "full"', () => {
    const result = createAuditSchema.parse({
      inputType: 'url',
      targetUrl: 'https://example.com',
      organizationId: orgId,
    })
    expect(result.mode).toBe('full')
  })
})
