/**
 * Code-mode variants of the audit phases.
 * V1 scope : technical + structured_data + geo. The other 7 phases remain
 * URL-only and report status=skipped on code audits.
 *
 * Regex-based parsing — AST parsing lands V1.5.
 */
import * as cheerio from 'cheerio'
import type { Finding, PhaseResult } from '../types'
import type { CodeSnapshot } from './read'
import { isBotDisallowed } from '../phases/geo'

interface CheckSpec {
  severity: Finding['severity']
  category: string
  title: string
  description: string
  recommendation: string
  pointsLost: number
  effort?: Finding['effort']
  metricValue?: string
  metricTarget?: string
  locationFile?: string
}

function build(
  phaseKey: Finding['phaseKey'],
  snapshot: CodeSnapshot,
  findings: Finding[],
  check: CheckSpec,
  scoreRef: { value: number },
) {
  findings.push({
    phaseKey,
    severity: check.severity,
    category: check.category,
    title: check.title,
    description: check.description,
    recommendation: check.recommendation,
    pointsLost: check.pointsLost,
    effort: check.effort,
    locationFile: check.locationFile,
    metricValue: check.metricValue,
    metricTarget: check.metricTarget,
  })
  scoreRef.value -= check.pointsLost
  void snapshot
}

function hasToken(source: string | null, pattern: RegExp): boolean {
  return !!source && pattern.test(source)
}

// --- Technical ------------------------------------------------------------

const TECHNICAL_MAX = 12

export async function runTechnicalPhaseCode(
  snapshot: CodeSnapshot,
): Promise<PhaseResult> {
  const findings: Finding[] = []
  const score = { value: TECHNICAL_MAX }
  const add = (c: CheckSpec) =>
    build('technical', snapshot, findings, c, score)

  const layout = snapshot.layoutSource ?? ''
  const rootHtml = snapshot.rootHtml ?? ''
  const combined = `${layout}\n${rootHtml}`

  // title
  if (
    !hasToken(combined, /\btitle\s*:\s*['"`{]/) &&
    !hasToken(rootHtml, /<title>[^<]+<\/title>/i)
  ) {
    add({
      severity: 'high',
      category: 'technical-title',
      title: 'Balise / export `title` absent',
      description:
        'Aucun titre détecté dans `app/layout.tsx` (metadata.title) ou dans `<title>` d\'une page statique.',
      recommendation:
        'Exporter `metadata: Metadata` avec `title` dans `app/layout.tsx` (Next App Router) ou ajouter `<title>` dans l\'HTML de référence.',
      pointsLost: 1,
      effort: 'quick',
    })
  }

  // meta description
  if (
    !hasToken(combined, /\bdescription\s*:\s*['"`{]/) &&
    !hasToken(rootHtml, /<meta\s+name=["']description["']/i)
  ) {
    add({
      severity: 'medium',
      category: 'technical-meta',
      title: 'Meta description absente',
      description:
        'Aucune meta description détectée dans metadata ou dans l\'HTML statique.',
      recommendation:
        'Ajouter `description` dans `metadata` (Next) ou `<meta name="description">` (HTML).',
      pointsLost: 1,
      effort: 'quick',
    })
  }

  // viewport (Next default sets it automatically but static HTML requires it explicitly)
  if (
    snapshot.stack.framework === 'static' &&
    !hasToken(rootHtml, /<meta\s+name=["']viewport["']/i)
  ) {
    add({
      severity: 'medium',
      category: 'technical-viewport',
      title: 'Meta viewport absente',
      description: 'Site HTML statique sans `<meta name="viewport">`.',
      recommendation:
        'Ajouter `<meta name="viewport" content="width=device-width, initial-scale=1">`.',
      pointsLost: 1,
      effort: 'quick',
    })
  }

  // lang
  if (
    !hasToken(combined, /<html\s+lang=["'][\w-]+/i) &&
    !hasToken(layout, /\blang:\s*['"`][\w-]+/)
  ) {
    add({
      severity: 'low',
      category: 'technical-lang',
      title: 'Attribut `lang` non détecté',
      description:
        'Impossible de vérifier l\'attribut `<html lang>` via le code source analysé.',
      recommendation:
        'S\'assurer que le layout expose `lang` (Next App Router : `<html lang="fr">`).',
      pointsLost: 1,
      effort: 'quick',
    })
  }

  // Open Graph
  const ogFields: Array<{ name: string; regex: RegExp }> = [
    { name: 'og:title', regex: /\bopenGraph\s*:[\s\S]*?\btitle\s*:/ },
    { name: 'og:description', regex: /\bopenGraph\s*:[\s\S]*?\bdescription\s*:/ },
    { name: 'og:image', regex: /\bopenGraph\s*:[\s\S]*?\bimages?\s*:/ },
  ]
  const ogMissing = ogFields.filter(
    (f) => !f.regex.test(combined) && !new RegExp(`<meta[^>]*property=["']${f.name}["']`, 'i').test(rootHtml),
  )
  for (const m of ogMissing) {
    add({
      severity: 'medium',
      category: 'technical-og',
      title: `${m.name} absent`,
      description:
        'Les métadonnées Open Graph ne sont pas détectées — vérifier `metadata.openGraph` ou `<meta property="og:…">`.',
      recommendation:
        'Configurer `openGraph` dans `metadata` (Next) avec title, description, images, url, type.',
      pointsLost: 1,
      effort: 'quick',
    })
  }

  // robots.txt
  if (!snapshot.robotsTxt) {
    add({
      severity: 'medium',
      category: 'technical-robots',
      title: 'robots.txt / robots.ts absent',
      description:
        'Aucun `public/robots.txt`, `app/robots.ts` ou équivalent détecté.',
      recommendation:
        'Ajouter un `robots.ts` (Next) ou `public/robots.txt` listant au moins `User-agent: *` et `Sitemap`.',
      pointsLost: 1,
      effort: 'quick',
    })
  }

  // sitemap
  if (!snapshot.sitemapXml) {
    add({
      severity: 'medium',
      category: 'technical-sitemap',
      title: 'Sitemap absent du code',
      description:
        'Aucun `public/sitemap.xml`, `app/sitemap.ts` ou équivalent détecté.',
      recommendation:
        'Générer un sitemap via `app/sitemap.ts` (Next) ou déposer `public/sitemap.xml`.',
      pointsLost: 2,
      effort: 'medium',
    })
  }

  score.value = Math.max(0, Math.min(TECHNICAL_MAX, score.value))
  return {
    phaseKey: 'technical',
    score: score.value,
    scoreMax: TECHNICAL_MAX,
    status: 'completed',
    summary: `Phase technique (code) — ${findings.length} constat${findings.length > 1 ? 's' : ''}, score ${score.value}/${TECHNICAL_MAX}`,
    findings,
  }
}

// --- Structured Data ------------------------------------------------------

const STRUCTURED_MAX = 15

function parseJsonLd(src: string): Record<string, unknown>[] {
  try {
    const parsed = JSON.parse(src)
    const out: Record<string, unknown>[] = []
    const visit = (n: unknown) => {
      if (!n || typeof n !== 'object') return
      if (Array.isArray(n)) return n.forEach(visit)
      const o = n as Record<string, unknown>
      if (Array.isArray(o['@graph'])) return (o['@graph'] as unknown[]).forEach(visit)
      out.push(o)
    }
    visit(parsed)
    return out
  } catch {
    return []
  }
}

function getTypes(obj: Record<string, unknown>): string[] {
  const raw = obj['@type']
  if (!raw) return []
  return Array.isArray(raw) ? raw.map(String) : [String(raw)]
}

export async function runStructuredDataPhaseCode(
  snapshot: CodeSnapshot,
): Promise<PhaseResult> {
  const findings: Finding[] = []
  const score = { value: STRUCTURED_MAX }
  const add = (c: CheckSpec) =>
    build('structured_data', snapshot, findings, c, score)

  const blocks = snapshot.structuredDataSources.flatMap(parseJsonLd)
  const typesSet = new Set<string>()
  blocks.forEach((b) => getTypes(b).forEach((t) => typesSet.add(t.toLowerCase())))

  // No JSON-LD at all
  if (blocks.length === 0) {
    add({
      severity: 'critical',
      category: 'schema-none',
      title: 'Aucun schema JSON-LD détecté dans le code',
      description:
        'Aucun `<script type="application/ld+json">` ni `JSON.stringify(...)` avec @context schema.org détecté dans layout/page/index.',
      recommendation:
        'Ajouter un composant qui rend un JSON-LD Organization + WebSite dans le `<head>` du layout.',
      pointsLost: 5,
      effort: 'medium',
    })
  }

  // Organization
  const hasOrg = typesSet.has('organization')
  if (!hasOrg) {
    add({
      severity: 'critical',
      category: 'schema-organization',
      title: 'Schema Organization absent',
      description:
        'Pas de JSON-LD Organization détecté dans le code. Fondation de l\'entity SEO.',
      recommendation:
        'Ajouter un JSON-LD Organization (name, url, logo, sameAs) dans le layout racine.',
      pointsLost: 3,
      effort: 'medium',
    })
  }

  const hasWebsite = typesSet.has('website')
  if (!hasWebsite) {
    add({
      severity: 'medium',
      category: 'schema-website',
      title: 'Schema WebSite absent',
      description: 'Pas de JSON-LD WebSite avec SearchAction détecté.',
      recommendation:
        'Ajouter WebSite + potentialAction SearchAction pour activer sitelinks search box.',
      pointsLost: 2,
      effort: 'quick',
    })
  }

  if (blocks.length > 0 && typesSet.size < 3) {
    add({
      severity: 'low',
      category: 'schema-stacking',
      title: 'Schema stacking faible',
      description:
        'Moins de 3 types distincts détectés — les pages stratégiques gagnent à empiler plusieurs schemas dans `@graph`.',
      recommendation:
        'Grouper Organization + WebSite + BreadcrumbList + WebPage dans un `@graph` sur la homepage.',
      pointsLost: 1,
      effort: 'medium',
    })
  }

  score.value = Math.max(0, Math.min(STRUCTURED_MAX, score.value))
  return {
    phaseKey: 'structured_data',
    score: score.value,
    scoreMax: STRUCTURED_MAX,
    status: 'completed',
    summary: `Phase Structured Data (code) — ${findings.length} constat${findings.length > 1 ? 's' : ''}, score ${score.value}/${STRUCTURED_MAX}`,
    findings,
  }
}

// --- GEO -----------------------------------------------------------------

const GEO_MAX = 18

const AI_BOTS_PRIMARY = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User'] as const
const AI_BOTS_SECONDARY = ['ClaudeBot', 'PerplexityBot', 'Google-Extended'] as const

export async function runGeoPhaseCode(
  snapshot: CodeSnapshot,
): Promise<PhaseResult> {
  const findings: Finding[] = []
  const score = { value: GEO_MAX }
  const add = (c: CheckSpec) => build('geo', snapshot, findings, c, score)

  // 1. llms.txt
  if (!snapshot.llmsTxt) {
    add({
      severity: 'high',
      category: 'geo-llms-txt',
      title: 'llms.txt absent du projet',
      description:
        'Aucun fichier `public/llms.txt` ou équivalent détecté.',
      recommendation:
        'Ajouter un `public/llms.txt` avec `# Titre`, `> Description`, puis sections listant les URLs clés.',
      pointsLost: 4,
      effort: 'medium',
    })
  } else {
    const hasTitle = /^#\s+\S/m.test(snapshot.llmsTxt)
    const hasDesc = /^>\s+\S/m.test(snapshot.llmsTxt)
    if (!hasTitle || !hasDesc) {
      add({
        severity: 'low',
        category: 'geo-llms-txt',
        title: 'llms.txt format incomplet',
        description:
          'Le fichier existe mais manque le titre `# ...` ou la description `> ...`.',
        recommendation: 'Compléter avec `# Titre` + `> Description`.',
        pointsLost: 1,
        effort: 'quick',
      })
    }
  }

  // 2. AI bots robots
  if (snapshot.robotsTxt) {
    const robotsStr =
      /<html|export\s+default/i.test(snapshot.robotsTxt)
        ? snapshot.robotsTxt // source file — we try to look for rules inside
        : snapshot.robotsTxt

    let botsPenalty = 0
    const blocked: string[] = []
    for (const bot of [...AI_BOTS_PRIMARY, ...AI_BOTS_SECONDARY]) {
      try {
        if (isBotDisallowed(robotsStr, bot)) {
          blocked.push(bot)
          botsPenalty = Math.min(6, botsPenalty + 2)
        }
      } catch {
        /* source file, not parseable */
      }
    }
    if (blocked.length > 0) {
      add({
        severity: 'critical',
        category: 'geo-ai-bots',
        title: `Bots IA bloqués (${blocked.length})`,
        description: `robots.txt exclut ${blocked.join(', ')}.`,
        recommendation:
          'Retirer les `Disallow: /` sur les bots IA (ou déplacer vers règles ciblées).',
        pointsLost: botsPenalty,
        effort: 'quick',
        metricValue: blocked.join(', '),
      })
    }
  }

  // 3. Heuristique semantic content : on check si au moins une page statique
  // ou un MDX expose un hero/paragraphe d'ouverture substantiel.
  const layout = snapshot.layoutSource ?? ''
  const $ = snapshot.rootHtml ? cheerio.load(snapshot.rootHtml) : null
  const firstHtmlPara = $ ? $('p').first().text() : ''
  const wordCount = firstHtmlPara
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
  if (snapshot.stack.framework === 'static' && wordCount < 100) {
    add({
      severity: 'medium',
      category: 'geo-semantic',
      title: 'Hero / paragraphe introductif court ou manquant (HTML statique)',
      description:
        'Sur un site HTML statique, la page d\'accueil doit exposer un paragraphe auto-suffisant 134-167 mots pour être réutilisable par les moteurs IA.',
      recommendation:
        'Étendre le paragraphe d\'ouverture de la homepage à 134-167 mots.',
      pointsLost: 2,
      effort: 'medium',
      metricValue: `${wordCount} mots`,
      metricTarget: '134–167 mots',
    })
  }

  // 4. Layout sans metadata.keywords ou description explicitant la valeur
  if (layout && !/description\s*:/.test(layout)) {
    add({
      severity: 'low',
      category: 'geo-semantic',
      title: 'metadata.description absente du layout',
      description:
        'Le layout Next n\'expose pas de `description` dans son `metadata`. Les moteurs IA utilisent fréquemment ce champ comme premier snippet.',
      recommendation:
        'Ajouter `description` dans `metadata` du layout, avec une formulation auto-suffisante (134-167 mots).',
      pointsLost: 1,
      effort: 'quick',
    })
  }

  score.value = Math.max(0, Math.min(GEO_MAX, score.value))
  return {
    phaseKey: 'geo',
    score: score.value,
    scoreMax: GEO_MAX,
    status: 'completed',
    summary: `Phase GEO (code) — ${findings.length} constat${findings.length > 1 ? 's' : ''}, score ${score.value}/${GEO_MAX}`,
    findings,
  }
}
