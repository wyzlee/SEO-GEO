// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthError } from '@/lib/auth/server'

const authenticateAutoMock = vi.fn()

const responses: unknown[][] = []
const updateCalls: unknown[] = []

vi.mock('@/lib/auth/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/server')>()
  return {
    ...actual,
    authenticateAuto: (req: Request) => authenticateAutoMock(req),
  }
})

vi.mock('@/lib/db', () => {
  function makeChain(kind: 'select' | 'update') {
    const chain: Record<string, unknown> = {}
    const passthrough = ['from', 'where', 'orderBy', 'limit', 'set']
    for (const m of passthrough) {
      chain[m] = (arg?: unknown) => {
        if (kind === 'update' && m === 'set') updateCalls.push(arg)
        return chain
      }
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
      select: () => makeChain('select'),
      update: () => makeChain('update'),
    },
  }
})

async function loadRoute() {
  const mod = await import('@/app/api/organizations/me/route')
  return mod
}

const req = (method: 'GET' | 'PATCH', body?: unknown) =>
  new Request('http://test.local/api/organizations/me', {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

describe('GET /api/organizations/me', () => {
  beforeEach(() => {
    authenticateAutoMock.mockReset()
    responses.length = 0
    updateCalls.length = 0
    authenticateAutoMock.mockResolvedValue({
      user: { id: 'user-1', email: 'olivier@wyzlee.cloud' },
      organizationId: 'org-1',
      role: 'owner',
    })
  })

  it('returns 401 when auth fails', async () => {
    authenticateAutoMock.mockRejectedValueOnce(new AuthError('nope', 401))
    const { GET } = await loadRoute()
    const res = await GET(req('GET'))
    expect(res.status).toBe(401)
  })

  it('returns 404 when org not found', async () => {
    responses.push([]) // org query empty
    const { GET } = await loadRoute()
    const res = await GET(req('GET'))
    expect(res.status).toBe(404)
  })

  it('returns org with branding normalized', async () => {
    responses.push([
      {
        id: 'org-1',
        name: 'Acme SEO',
        slug: 'acme-seo',
        plan: 'free',
        branding: {
          companyName: 'Acme',
          logoUrl: 'https://acme.com/logo.png',
          primaryColor: '#FF0000',
          accentColor: null,
        },
      },
    ])
    const { GET } = await loadRoute()
    const res = await GET(req('GET'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.name).toBe('Acme SEO')
    expect(json.role).toBe('owner')
    expect(json.branding.companyName).toBe('Acme')
    expect(json.branding.logoUrl).toBe('https://acme.com/logo.png')
    expect(json.branding.primaryColor).toBe('#FF0000')
  })

  it('returns branding=null when no branding stored', async () => {
    responses.push([
      {
        id: 'org-1',
        name: 'Acme',
        slug: 'acme',
        plan: 'free',
        branding: null,
      },
    ])
    const { GET } = await loadRoute()
    const res = await GET(req('GET'))
    const json = await res.json()
    expect(json.branding).toBeNull()
  })
})

describe('PATCH /api/organizations/me', () => {
  beforeEach(() => {
    authenticateAutoMock.mockReset()
    responses.length = 0
    updateCalls.length = 0
    authenticateAutoMock.mockResolvedValue({
      user: { id: 'user-1', email: 'olivier@wyzlee.cloud' },
      organizationId: 'org-1',
      role: 'owner',
    })
  })

  it('returns 401 when auth fails', async () => {
    authenticateAutoMock.mockRejectedValueOnce(new AuthError('nope', 401))
    const { PATCH } = await loadRoute()
    const res = await PATCH(req('PATCH', { primaryColor: '#FFFFFF' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when role is not owner or admin', async () => {
    authenticateAutoMock.mockResolvedValueOnce({
      user: { id: 'user-1', email: '' },
      organizationId: 'org-1',
      role: 'member',
    })
    const { PATCH } = await loadRoute()
    const res = await PATCH(req('PATCH', { primaryColor: '#FFFFFF' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 on invalid hex color', async () => {
    const { PATCH } = await loadRoute()
    const res = await PATCH(req('PATCH', { primaryColor: 'red' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 on invalid logo URL (non-http)', async () => {
    const { PATCH } = await loadRoute()
    const res = await PATCH(
      req('PATCH', { logoUrl: 'javascript:alert(1)' }),
    )
    expect(res.status).toBe(400)
  })

  it('persists valid branding and returns it', async () => {
    responses.push([]) // update has no returning but the mock chain still resolves
    const { PATCH } = await loadRoute()
    const res = await PATCH(
      req('PATCH', {
        companyName: 'Acme',
        logoUrl: 'https://acme.com/l.png',
        primaryColor: '#112233',
        accentColor: '#445566',
      }),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.branding.companyName).toBe('Acme')
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0]).toMatchObject({
      branding: {
        companyName: 'Acme',
        logoUrl: 'https://acme.com/l.png',
        primaryColor: '#112233',
        accentColor: '#445566',
      },
    })
  })

  it('accepts nested { branding: {...} } payload shape too', async () => {
    responses.push([])
    const { PATCH } = await loadRoute()
    const res = await PATCH(
      req('PATCH', { branding: { primaryColor: '#112233' } }),
    )
    expect(res.status).toBe(200)
  })
})
