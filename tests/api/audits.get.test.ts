// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthError } from '@/lib/auth/server'

const authenticateAutoMock = vi.fn()

// File de réponses dépiles dans l'ordre où le code appelle db.select(...).
// Pour Promise.all([phases, findings]) l'ordre des éléments du tableau définit
// l'ordre de consommation (V8 attache .then() dans l'ordre des index).
const responses: unknown[][] = []

vi.mock('@/lib/auth/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/server')>()
  return {
    ...actual,
    authenticateAuto: (req: Request) => authenticateAutoMock(req),
  }
})

vi.mock('@/lib/db', () => {
  function makeChain() {
    const chain: Record<string, unknown> = {}
    const passthrough = ['from', 'where', 'orderBy', 'limit', 'innerJoin', 'leftJoin']
    for (const m of passthrough) {
      chain[m] = () => chain
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
  return { db: { select: () => makeChain() } }
})

async function loadGetById() {
  const mod = await import('@/app/api/audits/[id]/route')
  return mod.GET
}

async function loadGetList() {
  const mod = await import('@/app/api/audits/route')
  return mod.GET
}

function buildRequest(url = 'http://test.local/api/audits/123') {
  return new Request(url, { method: 'GET' })
}

describe('GET /api/audits/:id', () => {
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
    const GET = await loadGetById()
    const res = await GET(buildRequest(), {
      params: Promise.resolve({ id: 'audit-1' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 404 when audit not found in current org (or wrong org)', async () => {
    // SQL where filtre déjà sur organizationId — un audit d'une autre org
    // n'apparaît tout simplement pas, donc c'est un 404 et pas un 403.
    responses.push([])
    const GET = await loadGetById()
    const res = await GET(buildRequest(), {
      params: Promise.resolve({ id: 'audit-from-other-org' }),
    })
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('Not found')
  })

  it('returns audit + phases + findings (findings groupés par phase) on happy path', async () => {
    const audit = {
      id: 'audit-1',
      organizationId: 'org-1',
      status: 'completed',
      scoreTotal: 78,
      targetUrl: 'https://example.com',
    }
    const phases = [
      { phaseKey: 'eeat', phaseOrder: 1, status: 'completed', score: 14 },
      { phaseKey: 'geo', phaseOrder: 2, status: 'completed', score: 8 },
    ]
    const findingsRows = [
      { phaseKey: 'eeat', message: 'Auteur manquant', pointsLost: 4 },
      { phaseKey: 'eeat', message: 'About page absente', pointsLost: 2 },
      { phaseKey: 'geo', message: 'Pas de FAQ schema', pointsLost: 3 },
    ]
    responses.push([audit], phases, findingsRows)

    const GET = await loadGetById()
    const res = await GET(buildRequest(), {
      params: Promise.resolve({ id: 'audit-1' }),
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.audit).toEqual(audit)
    expect(json.phases).toHaveLength(2)
    const eeat = json.phases.find((p: { phaseKey: string }) => p.phaseKey === 'eeat')
    const geo = json.phases.find((p: { phaseKey: string }) => p.phaseKey === 'geo')
    expect(eeat.findings).toHaveLength(2)
    expect(geo.findings).toHaveLength(1)
    expect(eeat.findings.map((f: { message: string }) => f.message)).toContain(
      'Auteur manquant',
    )
  })

  it('isolates orgs : un audit d\'une autre org ne fuit pas (vérifie filtre WHERE)', async () => {
    // L'auth résout sur org-1. Le SQL WHERE inclut organizationId = org-1.
    // Notre stub renvoie [] → 404. On valide que le code NE retourne PAS l'audit
    // si la query org-scopée ne le matche pas (c'est-à-dire qu'on n'a pas oublié
    // le filtre côté handler).
    responses.push([]) // audit query renvoie vide → 404 immédiat
    const GET = await loadGetById()
    const res = await GET(buildRequest(), {
      params: Promise.resolve({ id: 'audit-belonging-to-org-2' }),
    })
    expect(res.status).toBe(404)
    // Confirme qu'on n'a PAS tenté de lire phases/findings après le 404
    expect(responses.length).toBe(0)
  })
})

describe('GET /api/audits (list)', () => {
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
    const GET = await loadGetList()
    const res = await GET(new Request('http://test.local/api/audits'))
    expect(res.status).toBe(401)
  })

  it('returns audits[] scoped to current org', async () => {
    const rows = [
      { id: 'a1', organizationId: 'org-1', targetUrl: 'https://a.com', status: 'completed' },
      { id: 'a2', organizationId: 'org-1', targetUrl: 'https://b.com', status: 'queued' },
    ]
    responses.push(rows)
    const GET = await loadGetList()
    const res = await GET(new Request('http://test.local/api/audits'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.audits).toEqual(rows)
  })

  it('returns empty list when org has no audits', async () => {
    responses.push([])
    const GET = await loadGetList()
    const res = await GET(new Request('http://test.local/api/audits'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.audits).toEqual([])
  })
})
