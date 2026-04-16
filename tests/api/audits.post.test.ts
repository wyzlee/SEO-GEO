// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthError } from '@/lib/auth/server'
import { __resetRateLimits } from '@/lib/security/rate-limit'

const authenticateAutoMock = vi.fn()
const processAuditMock = vi.fn()
const afterMock = vi.fn()
const insertedIds: string[] = []
let nextAuditId = 0

vi.mock('@/lib/auth/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/server')>()
  return {
    ...actual,
    authenticateAuto: (req: Request) => authenticateAutoMock(req),
  }
})

vi.mock('@/lib/audit/process', () => ({
  processAudit: (id: string) => processAuditMock(id),
}))

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>()
  return {
    ...actual,
    after: (cb: () => void | Promise<void>) => afterMock(cb),
  }
})

vi.mock('@/lib/db', () => {
  const builder = {
    insert: () => builder,
    values: () => builder,
    returning: async () => {
      nextAuditId += 1
      const id = `audit-${nextAuditId}`
      insertedIds.push(id)
      return [{ id }]
    },
    select: () => builder,
    from: () => builder,
    where: () => builder,
    orderBy: () => builder,
    limit: async () => [],
  }
  return { db: builder }
})

async function loadPost() {
  const mod = await import('@/app/api/audits/route')
  return mod.POST
}

function buildRequest(body: unknown, opts: { raw?: string } = {}) {
  return new Request('http://test.local/api/audits', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: opts.raw !== undefined ? opts.raw : JSON.stringify(body),
  })
}

describe('POST /api/audits', () => {
  beforeEach(() => {
    authenticateAutoMock.mockReset()
    processAuditMock.mockReset()
    afterMock.mockReset()
    insertedIds.length = 0
    nextAuditId = 0
    __resetRateLimits()
    authenticateAutoMock.mockResolvedValue({
      user: { id: 'user-1', email: 'olivier@wyzlee.cloud' },
      organizationId: 'org-1',
      role: 'owner',
    })
  })

  afterEach(() => {
    __resetRateLimits()
  })

  it('returns 401 when authentication fails', async () => {
    authenticateAutoMock.mockRejectedValueOnce(
      new AuthError('Missing authentication token', 401),
    )
    const POST = await loadPost()
    const res = await POST(buildRequest({ targetUrl: 'https://example.com' }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toMatch(/Missing authentication token/)
    expect(afterMock).not.toHaveBeenCalled()
  })

  it('returns 400 on invalid JSON body', async () => {
    const POST = await loadPost()
    const res = await POST(buildRequest(null, { raw: '{not-json' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid JSON body')
  })

  it('returns 400 when no input (targetUrl/uploadPath/githubRepo) provided', async () => {
    const POST = await loadPost()
    const res = await POST(buildRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Validation failed')
    expect(json.issues).toBeInstanceOf(Array)
  })

  it('blocks SSRF attempts on loopback / private IPs', async () => {
    const POST = await loadPost()
    for (const targetUrl of [
      'http://localhost/admin',
      'http://127.0.0.1/',
      'http://169.254.169.254/latest/meta-data/',
      'http://192.168.1.1/',
    ]) {
      const res = await POST(buildRequest({ targetUrl }))
      expect(res.status, `expected 400 for ${targetUrl}`).toBe(400)
      const json = await res.json()
      expect(json.reason).toBeTruthy()
    }
    expect(afterMock).not.toHaveBeenCalled()
  })

  it('returns 202 + audit id on happy path and schedules processAudit via after()', async () => {
    const POST = await loadPost()
    const res = await POST(buildRequest({ targetUrl: 'https://example.com' }))
    expect(res.status).toBe(202)
    const json = await res.json()
    expect(json).toEqual({ id: 'audit-1', status: 'queued' })
    expect(insertedIds).toEqual(['audit-1'])
    expect(afterMock).toHaveBeenCalledTimes(1)

    // Exécuter le callback passé à after() et vérifier qu'il déclenche processAudit
    const cb = afterMock.mock.calls[0][0] as () => Promise<void>
    await cb()
    expect(processAuditMock).toHaveBeenCalledWith('audit-1')
  })

  it('returns 429 on burst rate-limit (4th request within 60s window)', async () => {
    const POST = await loadPost()
    const url = 'https://example.com'
    for (let i = 0; i < 3; i += 1) {
      const ok = await POST(buildRequest({ targetUrl: url }))
      expect(ok.status, `request ${i + 1} should pass burst`).toBe(202)
    }
    const blocked = await POST(buildRequest({ targetUrl: url }))
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('retry-after')).toBeTruthy()
    const json = await blocked.json()
    expect(json.error).toMatch(/Trop de requêtes/)
    expect(json.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('accepts githubRepo input (inputType=github)', async () => {
    const POST = await loadPost()
    const res = await POST(
      buildRequest({ githubRepo: 'wyzlee/seo-geo' }),
    )
    expect(res.status).toBe(202)
    expect(afterMock).toHaveBeenCalledTimes(1)
  })

  it('rejects malformed targetUrl via Zod .url()', async () => {
    const POST = await loadPost()
    const res = await POST(buildRequest({ targetUrl: 'not-a-url' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Validation failed')
  })
})
