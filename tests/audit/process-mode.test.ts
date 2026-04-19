// @vitest-environment node
/**
 * Tests that processAudit respects the mode config:
 * - standard: runs only the 8 configured phases
 * - full: runs all 11 phases
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AUDIT_MODE_CONFIGS } from '@/lib/audit/modes'

// Track which phases were attempted
const phasesCalled: string[] = []

const crawlMock = vi.fn()
vi.mock('@/lib/audit/crawl', () => ({
  crawlUrl: (...args: unknown[]) => crawlMock(...args),
}))

function makePhaseResult(key: string) {
  return { phaseKey: key, score: 5, scoreMax: 10, status: 'completed', summary: '', findings: [] }
}

// Mock all phase runners — use importOriginal to preserve re-exported constants
vi.mock('@/lib/audit/phases/technical', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/audit/phases/technical')>()
  return { ...actual, runTechnicalPhase: () => { phasesCalled.push('technical'); return makePhaseResult('technical') } }
})
vi.mock('@/lib/audit/phases/structured-data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/audit/phases/structured-data')>()
  return { ...actual, runStructuredDataPhase: () => { phasesCalled.push('structured_data'); return makePhaseResult('structured_data') } }
})
vi.mock('@/lib/audit/phases/geo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/audit/phases/geo')>()
  return { ...actual, runGeoPhase: () => { phasesCalled.push('geo'); return makePhaseResult('geo') } }
})
vi.mock('@/lib/audit/phases/entity', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/audit/phases/entity')>()
  return { ...actual, runEntityPhase: () => { phasesCalled.push('entity'); return makePhaseResult('entity') } }
})
vi.mock('@/lib/audit/phases/eeat', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/audit/phases/eeat')>()
  return { ...actual, runEeatPhase: () => { phasesCalled.push('eeat'); return makePhaseResult('eeat') } }
})
vi.mock('@/lib/audit/phases/freshness', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/audit/phases/freshness')>()
  return { ...actual, runFreshnessPhase: () => { phasesCalled.push('freshness'); return makePhaseResult('freshness') } }
})
vi.mock('@/lib/audit/phases/international', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/audit/phases/international')>()
  return { ...actual, runInternationalPhase: () => { phasesCalled.push('international'); return makePhaseResult('international') } }
})
vi.mock('@/lib/audit/phases/performance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/audit/phases/performance')>()
  return { ...actual, runPerformancePhase: () => { phasesCalled.push('performance'); return makePhaseResult('performance') } }
})
vi.mock('@/lib/audit/phases/topical', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/audit/phases/topical')>()
  return { ...actual, runTopicalPhase: () => { phasesCalled.push('topical'); return makePhaseResult('topical') } }
})
vi.mock('@/lib/audit/phases/common-mistakes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/audit/phases/common-mistakes')>()
  return { ...actual, runCommonMistakesPhase: () => { phasesCalled.push('common_mistakes'); return makePhaseResult('common_mistakes') } }
})
vi.mock('@/lib/audit/phases/synthesis', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/audit/phases/synthesis')>()
  return { ...actual, runSynthesisPhase: () => { phasesCalled.push('synthesis'); return makePhaseResult('synthesis') } }
})

// Code phases (not used in URL mode)
vi.mock('@/lib/audit/code/phases', () => ({
  runTechnicalPhaseCode: vi.fn(),
  runStructuredDataPhaseCode: vi.fn(),
  runGeoPhaseCode: vi.fn(),
}))
vi.mock('@/lib/audit/code/read', () => ({
  readCodeSnapshot: vi.fn(),
}))
vi.mock('@/lib/audit/code/clone', () => ({
  cloneGithubRepo: vi.fn(),
}))
vi.mock('@/lib/audit/upload/extract', () => ({
  cleanupRoot: vi.fn(),
}))
vi.mock('@/lib/email/notify-audit-completed', () => ({
  notifyAuditCompleted: vi.fn(),
}))
vi.mock('@/lib/webhooks/dispatch', () => ({
  dispatchWebhookEvent: vi.fn(),
}))
vi.mock('@/lib/observability/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// Minimal DB mock. `then` rend le builder awaitable pour les queries sans
// `.limit()` terminal (existingRows, prevFindings). Résout à [] par défaut.
interface DbMock {
  [k: string]: unknown
  select: () => DbMock
  from: () => DbMock
  where: () => DbMock
  limit: ReturnType<typeof vi.fn>
  update: () => DbMock
  set: () => DbMock
  returning: ReturnType<typeof vi.fn>
  insert: () => DbMock
  values: () => DbMock
  onConflictDoNothing: ReturnType<typeof vi.fn>
  then: (resolve: (v: unknown) => unknown) => unknown
}

const dbMock: DbMock = {
  select: () => dbMock,
  from: () => dbMock,
  where: () => dbMock,
  limit: vi.fn(),
  update: () => dbMock,
  set: () => dbMock,
  returning: vi.fn(),
  insert: () => dbMock,
  values: () => dbMock,
  onConflictDoNothing: vi.fn().mockResolvedValue([]),
  then: (resolve) => resolve([]),
}

vi.mock('@/lib/db', () => ({ db: dbMock }))
vi.mock('@/lib/db/schema', async (importOriginal) => {
  return importOriginal()
})

function makeAuditRow(mode: string) {
  return {
    id: 'audit-1',
    organizationId: 'org-1',
    inputType: 'url',
    targetUrl: 'https://example.com',
    uploadPath: null,
    githubRepo: null,
    status: 'queued',
    mode,
    scoreTotal: null,
    scoreBreakdown: null,
    clientName: null,
    consultantName: null,
    previousAuditId: null,
    queuedAt: new Date(),
    startedAt: null,
    finishedAt: null,
    errorMessage: null,
    createdAt: new Date(),
  }
}

describe('AUDIT_MODE_CONFIGS', () => {
  it('flash has 4 phases and maxSubPages=0', () => {
    const cfg = AUDIT_MODE_CONFIGS.flash
    expect(cfg.phases).toHaveLength(4)
    expect(cfg.phases).toContain('technical')
    expect(cfg.phases).toContain('geo')
    expect(cfg.phases).not.toContain('eeat')
    expect(cfg.maxSubPages).toBe(0)
  })

  it('standard has 8 phases and maxSubPages=3', () => {
    const cfg = AUDIT_MODE_CONFIGS.standard
    expect(cfg.phases).toHaveLength(8)
    expect(cfg.phases).toContain('synthesis')
    expect(cfg.phases).not.toContain('international')
    expect(cfg.phases).not.toContain('performance')
    expect(cfg.phases).not.toContain('topical')
    expect(cfg.maxSubPages).toBe(3)
  })

  it('full has 11 phases, maxSubPages=0 and bfsMaxPages=50', () => {
    const cfg = AUDIT_MODE_CONFIGS.full
    expect(cfg.phases).toHaveLength(11)
    expect(cfg.maxSubPages).toBe(0)
    expect(cfg.bfsMaxPages).toBe(50)
  })
})

describe('resolveModeConfig', () => {
  it('resolves null/undefined to full', async () => {
    const { resolveModeConfig } = await import('@/lib/audit/modes')
    expect(resolveModeConfig(null).maxSubPages).toBe(0)
    expect(resolveModeConfig(undefined).maxSubPages).toBe(0)
    expect(resolveModeConfig('unknown').maxSubPages).toBe(0)
  })

  it('resolves standard correctly', async () => {
    const { resolveModeConfig } = await import('@/lib/audit/modes')
    const cfg = resolveModeConfig('standard')
    expect(cfg.phases).toHaveLength(8)
    expect(cfg.timeoutMs).toBe(120_000)
  })

  it('resolves flash correctly', async () => {
    const { resolveModeConfig } = await import('@/lib/audit/modes')
    const cfg = resolveModeConfig('flash')
    expect(cfg.phases).toHaveLength(4)
    expect(cfg.timeoutMs).toBe(15_000)
  })
})

describe('processAudit — mode-aware phase selection', () => {
  beforeEach(() => {
    phasesCalled.length = 0
    crawlMock.mockReset()
    dbMock.limit.mockReset()
    dbMock.returning.mockReset()
    dbMock.onConflictDoNothing.mockReset()

    crawlMock.mockResolvedValue({
      html: '<html></html>',
      finalUrl: 'https://example.com',
      status: 200,
      robotsTxt: null,
      sitemapXml: null,
      llmsTxt: null,
      llmsFullTxt: null,
      lastModified: null,
      contentHash: 'abc',
      subPages: [],
    })
    dbMock.onConflictDoNothing.mockResolvedValue([])
    dbMock.returning.mockResolvedValue([{ id: 'audit-1', organizationId: 'org-1', targetUrl: 'https://example.com', clientName: null, scoreTotal: null, finishedAt: null }])
  })

  it('standard mode: runs only the 8 standard phases (not international, performance, topical)', async () => {
    // First call: mode lookup, second: full audit row
    dbMock.limit
      .mockResolvedValueOnce([{ mode: 'standard' }])
      .mockResolvedValueOnce([makeAuditRow('standard')])
      .mockResolvedValue([])

    const { processAudit } = await import('@/lib/audit/process')
    await processAudit('audit-1')

    const standardPhases = AUDIT_MODE_CONFIGS.standard.phases
    for (const phase of standardPhases) {
      if (phase !== 'synthesis') {
        expect(phasesCalled, `expected ${phase} to be called`).toContain(phase)
      }
    }
    expect(phasesCalled).not.toContain('international')
    expect(phasesCalled).not.toContain('performance')
    expect(phasesCalled).not.toContain('topical')
  })

  it('standard mode: passes maxSubPages=3 to crawlUrl', async () => {
    dbMock.limit
      .mockResolvedValueOnce([{ mode: 'standard' }])
      .mockResolvedValueOnce([makeAuditRow('standard')])
      .mockResolvedValue([])

    const { processAudit } = await import('@/lib/audit/process')
    await processAudit('audit-1')

    expect(crawlMock).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({ maxSubPages: 3 }),
    )
  })

  it('full mode: passes maxSubPages=0 to crawlUrl (bfsMaxPages=50 via crawlMultiPage)', async () => {
    dbMock.limit
      .mockResolvedValueOnce([{ mode: 'full' }])
      .mockResolvedValueOnce([makeAuditRow('full')])
      .mockResolvedValue([])

    const { processAudit } = await import('@/lib/audit/process')
    await processAudit('audit-1')

    // bfsMaxPages est passé à crawlMultiPage (pas à crawlUrl) — seul maxSubPages=0 arrive ici
    expect(crawlMock).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({ maxSubPages: 0 }),
    )
  })
})
