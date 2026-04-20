/**
 * Génération de content briefs éditoriaux depuis les findings d'un audit.
 *
 * Logique :
 * 1. Filtrer les findings des phases `topical` et `freshness`
 * 2. Identifier les 3 gaps prioritaires (pointsLost DESC, dédup par title)
 * 3. Pour chaque gap, générer un brief JSON via Claude
 * 4. Valider le JSON avec Zod avant persistance
 * 5. Insérer dans contentBriefs avec organization_id scoped
 *
 * Modèle : claude-sonnet-4-6 (ou ANTHROPIC_DEFAULT_MODEL env)
 * Timeout : 30s par appel Claude
 */
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { db } from '@/lib/db'
import { contentBriefs } from '@/lib/db/schema'
import { contentBriefClaudeResponseSchema } from '@/lib/types/briefs'
import type { ContentBrief } from '@/lib/db/schema'
import { logger } from '@/lib/observability/logger'

const MAX_BRIEFS = 3

interface BriefFinding {
  phaseKey: string
  title: string
  description: string
  recommendation: string
  pointsLost?: number
}

export interface GenerateContentBriefsParams {
  auditId: string
  organizationId: string
  findings: BriefFinding[]
  targetUrl: string
}

// Prompt système figé pour cache_control
const SYSTEM_PROMPT = `Tu es un expert SEO 2026 spécialisé dans la stratégie de contenu et l'architecture de l'information.
Tu génères des briefs de contenu ultra-précis et actionnables pour des rédacteurs SEO.
Tes briefs sont en français, orientés E-E-A-T, et tiennent compte des signaux GEO (Generative Engine Optimization).
Tu réponds TOUJOURS en JSON strict, sans texte autour, sans balises Markdown.`

function buildBriefPrompt(targetUrl: string, gapDescription: string): string {
  return `Site audité: ${targetUrl}
Gap détecté: ${gapDescription}

Format de réponse OBLIGATOIRE (JSON uniquement, aucun texte autour, aucun bloc de code Markdown) :
{
  "title": "Titre exact de l'article (optimisé SEO, <70 caractères)",
  "targetKeyword": "mot-clé principal (intention de recherche principale)",
  "searchIntent": "informational|commercial|navigational",
  "contentType": "pillar|cluster|update",
  "wordCountTarget": 2500,
  "outline": {
    "h2": ["Section 1", "Section 2", "Section 3"],
    "h3_per_h2": [["Sous-section 1.1", "Sous-section 1.2"], ["Sous-section 2.1"], []]
  },
  "eeatAngle": "Comment démontrer Experience, Expertise, Authority, Trust sur ce sujet",
  "semanticKeywords": ["mot1", "mot2", "mot3", "mot4", "mot5"]
}`
}


/**
 * Sélectionne les 3 gaps prioritaires depuis les findings topical + freshness.
 * Tri par pointsLost DESC, dédup par titre.
 */
function selectTopGaps(findings: BriefFinding[]): BriefFinding[] {
  const relevant = findings.filter(
    (f) => f.phaseKey === 'topical' || f.phaseKey === 'freshness',
  )

  const seen = new Set<string>()
  const deduped: BriefFinding[] = []
  for (const f of relevant.sort(
    (a, b) => (b.pointsLost ?? 0) - (a.pointsLost ?? 0),
  )) {
    if (!seen.has(f.title)) {
      seen.add(f.title)
      deduped.push(f)
    }
  }

  return deduped.slice(0, MAX_BRIEFS)
}

/**
 * Appelle Claude pour générer un brief à partir d'un gap détecté.
 * Retourne null si la réponse ne passe pas la validation Zod (gracieux).
 */
async function generateOneBrief(
  client: Anthropic,
  targetUrl: string,
  gap: BriefFinding,
  model: string,
): Promise<z.infer<typeof contentBriefClaudeResponseSchema> | null> {
  const gapDescription = [
    `Phase : ${gap.phaseKey}`,
    `Problème : ${gap.title}`,
    `Détail : ${gap.description}`,
    `Recommandation : ${gap.recommendation}`,
  ].join('\n')

  try {
    const message = await client.messages.create(
      {
        model,
        max_tokens: 2048,
        tools: [
          {
            name: 'generate_brief',
            description: 'Generate a structured content brief from an SEO gap',
            input_schema: {
              type: 'object' as const,
              properties: {
                title: { type: 'string', minLength: 1, maxLength: 500 },
                targetKeyword: { type: 'string', minLength: 1, maxLength: 200 },
                searchIntent: { type: 'string', enum: ['informational', 'commercial', 'navigational'] },
                contentType: { type: 'string', enum: ['pillar', 'cluster', 'update'] },
                wordCountTarget: { type: 'integer', minimum: 300, maximum: 10000 },
                outline: {
                  type: 'object',
                  properties: {
                    h2: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 20 },
                    h3_per_h2: { type: 'array', items: { type: 'array', items: { type: 'string' } }, maxItems: 20 },
                  },
                  required: ['h2', 'h3_per_h2'],
                  additionalProperties: false,
                },
                eeatAngle: { type: 'string', maxLength: 1000 },
                semanticKeywords: { type: 'array', items: { type: 'string' }, maxItems: 50 },
              },
              required: ['title', 'targetKeyword', 'searchIntent', 'contentType', 'wordCountTarget', 'outline', 'semanticKeywords'],
              additionalProperties: false,
            },
          },
        ],
        tool_choice: { type: 'tool', name: 'generate_brief' },
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: buildBriefPrompt(targetUrl, gapDescription),
          },
        ],
      },
      { timeout: 30_000 },
    )

    logger.info('briefs.claude.tokens', {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      cache_read_input_tokens: (message.usage as unknown as Record<string, unknown>).cache_read_input_tokens ?? 0,
      cache_creation_input_tokens: (message.usage as unknown as Record<string, unknown>).cache_creation_input_tokens ?? 0,
    })

    const toolUseBlock = message.content.find((b) => b.type === 'tool_use')
    if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
      logger.warn('briefs.claude.no_tool_use', { gap_title: gap.title.slice(0, 80) })
      return null
    }

    // Valider avec Zod (toolUseBlock.input est typé unknown dans le SDK)
    const validated = contentBriefClaudeResponseSchema.safeParse(toolUseBlock.input)
    if (!validated.success) {
      logger.warn('briefs.claude.zod_invalid', {
        gap_title: gap.title.slice(0, 80),
        issues_count: validated.error.issues.length,
      })
      return null
    }

    return validated.data
  } catch (err) {
    logger.error('briefs.claude.error', {
      gap_title: gap.title.slice(0, 80),
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/**
 * Génère et persiste les content briefs pour un audit donné.
 * Retourne le tableau des briefs insérés (peut être vide si Claude indisponible).
 */
export async function generateContentBriefs(
  params: GenerateContentBriefsParams,
): Promise<ContentBrief[]> {
  const { auditId, organizationId, findings, targetUrl } = params

  const gaps = selectTopGaps(findings)

  if (gaps.length === 0) {
    logger.info('briefs.no_gaps', { audit_id: auditId, org_id: organizationId })
    return []
  }

  const model = process.env.ANTHROPIC_DEFAULT_MODEL ?? 'claude-sonnet-4-6'
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2 })

  logger.info('briefs.generation.start', {
    audit_id: auditId,
    org_id: organizationId,
    gap_count: gaps.length,
    model,
  })

  // Générer les briefs en parallèle (3 max, timeout 30s chacun via SDK)
  // N=3 ne sature pas l'API Claude — parallèle réduit la durée totale de ~90s à ~30s.
  const settled = await Promise.allSettled(
    gaps.map((gap) => generateOneBrief(client, targetUrl, gap, model)),
  )

  const inserted: ContentBrief[] = []

  for (let i = 0; i < settled.length; i++) {
    const s = settled[i]
    if (s.status === 'rejected') {
      logger.error('briefs.generation.rejected', {
        audit_id: auditId,
        gap_title: gaps[i].title.slice(0, 80),
        error: s.reason instanceof Error ? s.reason.message : String(s.reason),
      })
      continue
    }

    const brief = s.value
    if (!brief) continue

    // Construire un résumé Markdown du brief pour stockage
    const briefMd = [
      `# ${brief.title}`,
      '',
      `**Mot-clé cible :** ${brief.targetKeyword}`,
      `**Intent :** ${brief.searchIntent} | **Type :** ${brief.contentType}`,
      `**Volume cible :** ${brief.wordCountTarget} mots`,
      '',
      '## Plan',
      ...brief.outline.h2.map((h2, idx) => {
        const h3s = brief.outline.h3_per_h2[idx] ?? []
        const h3Lines = h3s.map((h3) => `   - ${h3}`)
        return [`- **${h2}**`, ...h3Lines].join('\n')
      }),
      '',
      '## Angle E-E-A-T',
      brief.eeatAngle ?? '',
      '',
      '## Mots-clés sémantiques',
      brief.semanticKeywords.join(', '),
    ].join('\n')

    try {
      const [row] = await db
        .insert(contentBriefs)
        .values({
          auditId,
          organizationId,
          title: brief.title,
          targetKeyword: brief.targetKeyword,
          searchIntent: brief.searchIntent,
          contentType: brief.contentType,
          wordCountTarget: brief.wordCountTarget,
          outline: brief.outline,
          eeatAngle: brief.eeatAngle ?? null,
          semanticKeywords: brief.semanticKeywords,
          briefMd,
        })
        .returning()

      inserted.push(row)

      logger.info('briefs.generated', {
        audit_id: auditId,
        brief_id: row.id,
        title_length: brief.title.length,
      })
    } catch (err) {
      logger.error('briefs.insert.error', {
        audit_id: auditId,
        org_id: organizationId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return inserted
}
