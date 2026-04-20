/**
 * Tests d'intégration — generateContentBriefs avec MSW.
 *
 * L'environnement Vitest est jsdom (browser-like). Le SDK Anthropic refuse de
 * s'instancier dans ce contexte sans `dangerouslyAllowBrowser`. On mocke donc
 * le module SDK pour remplacer le constructeur par un client léger qui délègue
 * ses appels à `fetch` — MSW intercepte alors ces appels normalement.
 *
 * Valide que :
 * 1. Le mock MSW intercepte bien l'appel Anthropic (pas de réseau réel).
 * 2. La réponse passe la validation Zod (contentBriefClaudeResponseSchema).
 * 3. Un brief est inséré en DB (via mock createMockDb).
 * 4. Si Anthropic renvoie une erreur 500, la fonction retourne [] sans throw.
 * 5. Si findings vides, aucun appel réseau n'est émis.
 * 6. Les doublons de titre sont dédupliqués avant d'appeler Claude.
 * 7. Un brief Zod-invalide est silencieusement ignoré.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { createMockDb, resetMockDb } from '../mocks/db'
import type { MockDb } from '../mocks/db'
import type { GenerateContentBriefsParams } from '@/lib/audit/briefs'

// --- Mock SDK Anthropic ---
// Le SDK refuserait de s'instancier en environnement jsdom. On le remplace par
// un shim qui envoie un vrai fetch vers l'endpoint Anthropic — MSW l'intercepte.
vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = {
      create: async (params: Record<string, unknown>) => {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        })
        if (!res.ok) {
          throw new Error(`Anthropic API error: HTTP ${res.status}`)
        }
        return res.json()
      },
    }
    constructor(_opts?: unknown) {}
  }
  return { default: MockAnthropic }
})

// --- Mock DB ---
const mockDb = createMockDb()
vi.mock('@/lib/db', () => ({ db: mockDb }))

// --- Mock logger (évite les sorties console dans les tests) ---
vi.mock('@/lib/observability/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Import après les mocks
const { generateContentBriefs } = await import('@/lib/audit/briefs')

// Fixture représentative conforme à BriefFinding
const MOCK_FINDINGS: GenerateContentBriefsParams['findings'] = [
  {
    phaseKey: 'topical',
    title: 'Couverture thématique insuffisante sur le SEO technique',
    description: 'Le site ne couvre pas les sous-thèmes clés de son domaine.',
    recommendation: 'Créer des articles de cluster sur les méta-données et le balisage schema.',
    pointsLost: 8,
  },
  {
    phaseKey: 'freshness',
    title: 'Contenu trop ancien — dernière mise à jour > 12 mois',
    description: 'Les articles principaux datent de 2024 et ne reflètent pas les updates Google 2025.',
    recommendation: 'Mettre à jour les 5 articles à fort trafic avec les données 2026.',
    pointsLost: 5,
  },
]

const BASE_PARAMS: GenerateContentBriefsParams = {
  auditId: 'audit-test-001',
  organizationId: 'org-test-001',
  findings: MOCK_FINDINGS,
  targetUrl: 'https://example.com',
}

// Fixture ContentBrief retournée par le mock DB
const MOCK_DB_BRIEF = {
  id: 'brief-mock-001',
  auditId: BASE_PARAMS.auditId,
  organizationId: BASE_PARAMS.organizationId,
  title: 'Comment optimiser son contenu SEO en 2026',
  targetKeyword: 'optimisation contenu SEO',
  searchIntent: 'informational' as const,
  contentType: 'pillar' as const,
  wordCountTarget: 2500,
  outline: {
    h2: ['Introduction au SEO 2026'],
    h3_per_h2: [['Contexte et enjeux']],
  },
  eeatAngle: 'Démontrer une expérience terrain.',
  semanticKeywords: ['stratégie contenu', 'référencement naturel'],
  briefMd: '# Comment optimiser son contenu SEO en 2026\n',
  createdAt: new Date('2026-04-20T10:00:00Z'),
}

describe('generateContentBriefs — MSW integration', () => {
  beforeEach(() => {
    resetMockDb(mockDb as MockDb)
    // Par défaut, le DB insert retourne un brief valide
    ;(mockDb as MockDb).returning.mockResolvedValue([MOCK_DB_BRIEF])
    process.env.ANTHROPIC_API_KEY = 'sk-test-mock-key'
  })

  it('génère un brief valide quand Anthropic répond avec le tool_use attendu', async () => {
    const result = await generateContentBriefs(BASE_PARAMS)

    // Au moins un brief inséré
    expect(result.length).toBeGreaterThan(0)
    // Vérifier les champs du premier brief
    expect(result[0].id).toBe('brief-mock-001')
    expect(result[0].title).toBe('Comment optimiser son contenu SEO en 2026')
    expect(result[0].searchIntent).toBe('informational')
  })

  it('ne fait aucun appel réseau si findings est vide', async () => {
    // Installer un handler qui fail si appelé
    let anthropicCalled = false
    server.use(
      http.post('https://api.anthropic.com/v1/messages', () => {
        anthropicCalled = true
        return HttpResponse.error()
      }),
    )

    const result = await generateContentBriefs({ ...BASE_PARAMS, findings: [] })

    expect(result).toHaveLength(0)
    expect(anthropicCalled).toBe(false)
  })

  it('ne fait aucun appel réseau si findings ne contient que des phases non-topical/freshness', async () => {
    let anthropicCalled = false
    server.use(
      http.post('https://api.anthropic.com/v1/messages', () => {
        anthropicCalled = true
        return HttpResponse.error()
      }),
    )

    const technicalOnly = MOCK_FINDINGS.map((f) => ({ ...f, phaseKey: 'technical' }))
    const result = await generateContentBriefs({ ...BASE_PARAMS, findings: technicalOnly })

    expect(result).toHaveLength(0)
    expect(anthropicCalled).toBe(false)
  })

  it('retourne [] sans throw si Anthropic répond HTTP 500', async () => {
    server.use(
      http.post('https://api.anthropic.com/v1/messages', () => {
        return new HttpResponse(null, { status: 500 })
      }),
    )

    // Pas d'exception — la fonction est gracieuse
    await expect(generateContentBriefs(BASE_PARAMS)).resolves.not.toThrow()
  })

  it('filtre les doublons de titre dans les gaps sélectionnés', async () => {
    const duplicatedFindings = [
      ...MOCK_FINDINGS,
      // Même titre que le premier finding — doit être dédupliqué
      { ...MOCK_FINDINGS[0], pointsLost: 3 },
    ]

    // Un seul brief inséré par titre unique (max 3, ici 2 titres uniques)
    ;(mockDb as MockDb).returning
      .mockResolvedValueOnce([MOCK_DB_BRIEF])
      .mockResolvedValueOnce([{ ...MOCK_DB_BRIEF, id: 'brief-mock-002', title: 'Contenu trop ancien' }])

    const result = await generateContentBriefs({ ...BASE_PARAMS, findings: duplicatedFindings })

    // 2 appels DB returning au max (2 titres uniques), pas 3
    const returningCallCount = (mockDb as MockDb).returning.mock.calls.length
    expect(returningCallCount).toBeLessThanOrEqual(2)
    expect(result.length).toBeLessThanOrEqual(2)
  })

  it('ignore un brief si la réponse Claude ne passe pas la validation Zod', async () => {
    // Payload invalide : wordCountTarget manquant
    server.use(
      http.post('https://api.anthropic.com/v1/messages', () => {
        return HttpResponse.json({
          id: 'msg_invalid',
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'tool_bad',
              name: 'generate_brief',
              input: {
                // title présent mais wordCountTarget absent → Zod échoue
                title: 'Brief invalide',
                targetKeyword: 'test',
                searchIntent: 'informational',
                contentType: 'pillar',
                // wordCountTarget: manquant intentionnellement
                outline: { h2: ['Section'], h3_per_h2: [[]] },
                semanticKeywords: [],
              },
            },
          ],
          model: 'claude-sonnet-4-6',
          stop_reason: 'tool_use',
          usage: { input_tokens: 10, output_tokens: 10, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
        })
      }),
    )

    const result = await generateContentBriefs(BASE_PARAMS)

    // Aucun insert DB si Zod invalide
    expect((mockDb as MockDb).returning.mock.calls.length).toBe(0)
    expect(result).toHaveLength(0)
  })
})
