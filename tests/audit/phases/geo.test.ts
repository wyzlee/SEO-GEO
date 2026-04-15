import { describe, expect, it } from 'vitest'
import { runGeoPhase, isBotDisallowed } from '@/lib/audit/phases/geo'
import type { CrawlSnapshot } from '@/lib/audit/types'

function snapshot(partial: Partial<CrawlSnapshot>): CrawlSnapshot {
  return {
    html: '<!doctype html><html><body></body></html>',
    finalUrl: 'https://example.com/',
    status: 200,
    robotsTxt: null,
    sitemapXml: null,
    llmsTxt: null,
    ...partial,
  }
}

const STRONG_PARAGRAPH = Array.from({ length: 150 })
  .map((_, i) => `mot${i}`)
  .join(' ')

const QUESTION_HTML = `<!doctype html>
<html lang="fr">
<body>
<main>
<p>${STRONG_PARAGRAPH}</p>
<h2>Comment configurer un audit ?</h2>
<p>Lancez l'audit depuis le dashboard, renseignez l'URL, cliquez sur valider. L'analyse commence immédiatement.</p>
<h2>Pourquoi viser GEO ?</h2>
<p>Les moteurs IA représentent déjà 12 % du trafic pour les sites B2B en 2026, avec 34 % de progression annuelle.</p>
<h2>Qui utilise la plateforme ?</h2>
<p>Agences SEO et studios dev français. 42 agences partenaires à ce jour.</p>
</main>
</body>
</html>`

const VALID_LLMS_TXT = `# Exemple
> Description courte du site pour les moteurs IA.

## Pages principales
- [Accueil](/) : landing générale.
- [Dashboard](/dashboard) : espace client.`

const ROBOTS_OK = `User-agent: *\nAllow: /`

const ROBOTS_BLOCK_AI = `User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: *
Allow: /`

describe('isBotDisallowed', () => {
  it('detects explicit bot block', () => {
    expect(isBotDisallowed(ROBOTS_BLOCK_AI, 'GPTBot')).toBe(true)
    expect(isBotDisallowed(ROBOTS_BLOCK_AI, 'ClaudeBot')).toBe(true)
  })

  it('falls back to wildcard when no explicit block', () => {
    const robots = `User-agent: *\nDisallow: /`
    expect(isBotDisallowed(robots, 'PerplexityBot')).toBe(true)
  })

  it('does not block bots when wildcard allows', () => {
    expect(isBotDisallowed(ROBOTS_OK, 'GPTBot')).toBe(false)
  })

  it('is case-insensitive on bot name', () => {
    expect(isBotDisallowed(ROBOTS_BLOCK_AI, 'gptbot')).toBe(true)
  })
})

describe('runGeoPhase', () => {
  it('scores close to max on a well-structured page', async () => {
    const result = await runGeoPhase(
      snapshot({
        html: QUESTION_HTML,
        robotsTxt: ROBOTS_OK,
        llmsTxt: VALID_LLMS_TXT,
      }),
    )
    expect(result.score).toBe(18)
    expect(result.scoreMax).toBe(18)
    expect(result.findings).toHaveLength(0)
  })

  it('flags llms.txt missing with high severity', async () => {
    const result = await runGeoPhase(
      snapshot({
        html: QUESTION_HTML,
        robotsTxt: ROBOTS_OK,
        llmsTxt: null,
      }),
    )
    const finding = result.findings.find((f) => f.category === 'geo-llms-txt')
    expect(finding?.severity).toBe('high')
    expect(finding?.pointsLost).toBe(4)
    expect(result.score).toBe(14)
  })

  it('flags llms.txt with broken markdown format', async () => {
    const result = await runGeoPhase(
      snapshot({
        html: QUESTION_HTML,
        robotsTxt: ROBOTS_OK,
        llmsTxt: 'Just plain text without markers',
      }),
    )
    const finding = result.findings.find((f) => f.category === 'geo-llms-txt')
    expect(finding?.pointsLost).toBe(1)
  })

  it('caps AI bots penalty at -6 even when more than 3 bots blocked', async () => {
    const allBlocked = [
      'GPTBot',
      'OAI-SearchBot',
      'ChatGPT-User',
      'ClaudeBot',
      'PerplexityBot',
      'Google-Extended',
    ]
      .map((bot) => `User-agent: ${bot}\nDisallow: /`)
      .join('\n\n')

    const result = await runGeoPhase(
      snapshot({
        html: QUESTION_HTML,
        robotsTxt: allBlocked,
        llmsTxt: VALID_LLMS_TXT,
      }),
    )
    const finding = result.findings.find((f) => f.category === 'geo-ai-bots')
    expect(finding?.severity).toBe('critical')
    expect(finding?.pointsLost).toBe(6)
    expect(result.score).toBe(12)
  })

  it('flags missing first paragraph', async () => {
    const result = await runGeoPhase(
      snapshot({
        html: '<!doctype html><html><body><h1>Titre</h1></body></html>',
        robotsTxt: ROBOTS_OK,
        llmsTxt: VALID_LLMS_TXT,
      }),
    )
    const finding = result.findings.find((f) => f.category === 'geo-semantic')
    expect(finding?.severity).toBe('high')
    expect(finding?.pointsLost).toBe(2)
  })

  it('flags first paragraph too short', async () => {
    const html = `<html><body><main><p>Trop court, seulement quelques mots.</p></main></body></html>`
    const result = await runGeoPhase(
      snapshot({ html, robotsTxt: ROBOTS_OK, llmsTxt: VALID_LLMS_TXT }),
    )
    const finding = result.findings.find((f) => f.category === 'geo-semantic')
    expect(finding?.severity).toBe('medium')
    expect(finding?.pointsLost).toBe(2)
  })

  it('flags H2s rarely formulated as questions', async () => {
    const html = `<html><body><main>
      <p>${STRONG_PARAGRAPH}</p>
      <h2>Nos services</h2><p>Description.</p>
      <h2>Notre équipe</h2><p>Description.</p>
      <h2>Nos bureaux</h2><p>Description.</p>
      <h2>Nos partenaires</h2><p>Description.</p>
    </main></body></html>`
    const result = await runGeoPhase(
      snapshot({ html, robotsTxt: ROBOTS_OK, llmsTxt: VALID_LLMS_TXT }),
    )
    const finding = result.findings.find(
      (f) => f.category === 'geo-answer-blocks' && f.severity === 'medium',
    )
    expect(finding).toBeDefined()
    expect(finding?.pointsLost).toBe(1)
  })

  it('is deterministic (golden test)', async () => {
    const run = () =>
      runGeoPhase(
        snapshot({
          html: QUESTION_HTML,
          robotsTxt: ROBOTS_BLOCK_AI,
          llmsTxt: null,
        }),
      )
    const a = await run()
    const b = await run()
    expect(a.score).toBe(b.score)
    expect(a.findings.length).toBe(b.findings.length)
  })
})
