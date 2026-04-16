// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthError } from '@/lib/auth/server'

const authenticateAutoMock = vi.fn()
const generateReportMock = vi.fn()

// Queue partagée : chaque chaîne SELECT (terminée par limit/orderBy await)
// ET chaque INSERT (.returning()) consomme une réponse dans l'ordre d'invocation.
const responses: unknown[][] = []

vi.mock('@/lib/auth/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/server')>()
  return {
    ...actual,
    authenticateAuto: (req: Request) => authenticateAutoMock(req),
  }
})

vi.mock('@/lib/report/generate', () => ({
  generateReport: (input: unknown) => generateReportMock(input),
}))

vi.mock('@/lib/db', () => {
  function makeChain() {
    const chain: Record<string, unknown> = {}
    const passthrough = ['from', 'where', 'orderBy', 'limit', 'innerJoin', 'leftJoin', 'values']
    for (const m of passthrough) {
      chain[m] = () => chain
    }
    chain.returning = () => {
      const rows = responses.shift() ?? []
      return Promise.resolve(rows)
    }
    chain.then = (
      resolve: (rows: unknown[]) => void,
      reject: (err: unknown) => void,
    ) => {
      const rows = responses.shift() ?? []
      Promise.resolve(rows).then(resolve, reject)
    }
    return chain
  }
  return {
    db: {
      select: () => makeChain(),
      insert: () => makeChain(),
    },
  }
})

async function loadPostReport() {
  const mod = await import('@/app/api/audits/[id]/report/route')
  return mod.POST
}
async function loadGetReports() {
  const mod = await import('@/app/api/audits/[id]/report/route')
  return mod.GET
}

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const req = (path = 'http://test.local/api/audits/123/report') =>
  new Request(path, { method: 'POST' })
const reqGet = (path = 'http://test.local/api/audits/123/report') =>
  new Request(path, { method: 'GET' })

describe('POST /api/audits/:id/report', () => {
  beforeEach(() => {
    authenticateAutoMock.mockReset()
    generateReportMock.mockReset()
    responses.length = 0
    authenticateAutoMock.mockResolvedValue({
      user: { id: 'user-1', email: 'olivier@wyzlee.cloud' },
      organizationId: 'org-1',
      role: 'owner',
    })
    generateReportMock.mockReturnValue({
      templateVersion: 'v1',
      markdown: '# Rapport',
      html: '<h1>Rapport</h1>',
    })
  })

  it('returns 401 when authentication fails', async () => {
    authenticateAutoMock.mockRejectedValueOnce(
      new AuthError('Missing authentication token', 401),
    )
    const POST = await loadPostReport()
    const res = await POST(req(), params('audit-1'))
    expect(res.status).toBe(401)
    expect(generateReportMock).not.toHaveBeenCalled()
  })

  it('returns 404 when audit not found in org', async () => {
    responses.push([]) // audit query empty
    const POST = await loadPostReport()
    const res = await POST(req(), params('missing'))
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('Not found')
    expect(generateReportMock).not.toHaveBeenCalled()
  })

  it('returns 409 when audit not yet completed', async () => {
    responses.push([{ id: 'audit-1', organizationId: 'org-1', status: 'running' }])
    responses.push([]) // phases (Promise.all)
    responses.push([]) // findings (Promise.all)
    const POST = await loadPostReport()
    const res = await POST(req(), params('audit-1'))
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/pas encore terminé/)
    expect(generateReportMock).not.toHaveBeenCalled()
  })

  it('returns 201 + share slug + URL on completed audit', async () => {
    responses.push([
      {
        id: 'audit-1',
        organizationId: 'org-1',
        status: 'completed',
        targetUrl: 'https://example.com',
        clientName: 'Acme',
        consultantName: 'Olivier',
        scoreTotal: 78,
        scoreBreakdown: { eeat: 14, geo: 8 },
        finishedAt: new Date('2026-04-15T10:00:00Z'),
      },
    ])
    responses.push([
      { phaseKey: 'eeat', score: 14, scoreMax: 20, status: 'completed', summary: 's' },
    ])
    responses.push([
      {
        phaseKey: 'eeat',
        severity: 'high',
        category: 'authority',
        title: 'Auteur manquant',
        description: 'd',
        recommendation: 'r',
        pointsLost: 4,
        effort: 'quick',
        locationUrl: null,
      },
    ])
    responses.push([{ id: 'report-1', shareSlug: 'abc123' }]) // insert returning

    const POST = await loadPostReport()
    const res = await POST(req(), params('audit-1'))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBe('report-1')
    expect(json.shareSlug).toBe('abc123')
    expect(json.shareUrl).toBe('/r/abc123')
    expect(json.expiresAt).toBeTruthy()
    expect(generateReportMock).toHaveBeenCalledTimes(1)
    const arg = generateReportMock.mock.calls[0][0] as {
      audit: { id: string }
      phases: unknown[]
      findings: unknown[]
    }
    expect(arg.audit.id).toBe('audit-1')
    expect(arg.phases).toHaveLength(1)
    expect(arg.findings).toHaveLength(1)
  })
})

describe('GET /api/audits/:id/report', () => {
  beforeEach(() => {
    authenticateAutoMock.mockReset()
    responses.length = 0
    authenticateAutoMock.mockResolvedValue({
      user: { id: 'user-1', email: 'olivier@wyzlee.cloud' },
      organizationId: 'org-1',
      role: 'owner',
    })
  })

  it('returns 401 when authentication fails', async () => {
    authenticateAutoMock.mockRejectedValueOnce(
      new AuthError('Missing authentication token', 401),
    )
    const GET = await loadGetReports()
    const res = await GET(reqGet(), params('audit-1'))
    expect(res.status).toBe(401)
  })

  it('returns 404 when audit not in org', async () => {
    responses.push([]) // audit ownership check returns empty
    const GET = await loadGetReports()
    const res = await GET(reqGet(), params('missing'))
    expect(res.status).toBe(404)
  })

  it('returns reports[] when audit is in org', async () => {
    responses.push([{ id: 'audit-1' }]) // ownership check
    const reportsRows = [
      { id: 'report-1', shareSlug: 'abc', generatedAt: new Date() },
      { id: 'report-2', shareSlug: 'def', generatedAt: new Date() },
    ]
    responses.push(reportsRows)
    const GET = await loadGetReports()
    const res = await GET(reqGet(), params('audit-1'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.reports).toHaveLength(2)
  })
})
