/**
 * Phase 3 — GEO Readiness (18 pts)
 *
 * Le poids le plus lourd de la rubric — cœur différenciant SEO-GEO en 2026.
 * Vérifie ce qui permet à un site d'apparaître dans les réponses des moteurs
 * génératifs (ChatGPT Search, Perplexity, Google AI Overviews, Claude, Apple
 * Intelligence, Meta AI, Bytespider…).
 *
 * Checks V1.5 (URL mode) :
 *  - /llms.txt + /llms-full.txt + format Markdown valide
 *  - robots.txt : couverture AI bots 2026 (13 bots trackés)
 *  - Premier paragraphe : 134-167 mots auto-suffisant
 *  - H2 formulés en questions + réponses courtes
 *  - FAQPage / HowTo schema (citation magnets)
 *  - Blockquote / citations (réutilisabilité)
 *  - Structure HTML5 sémantique (<article>, <section>, <main>, <nav>)
 *  - Evidence quantifiée
 *  - Ton hedging (info)
 *
 * Input type: URL.
 * Références : .claude/docs/audit-engine.md, .claude/docs/seo-geo-knowledge.md
 */
import * as cheerio from 'cheerio'
import type { Finding, PhaseResult, CrawlSnapshot } from '../types'

const SCORE_MAX = 18
const PHASE_KEY = 'geo' as const

// Bots IA trackés en 2026. Primary = moteurs majeurs grand public, le blocage
// doit être exceptionnel. Secondary = moteurs émergents / régionaux / B2B.
const AI_BOTS_PRIMARY = ['GPTBot', 'ClaudeBot', 'PerplexityBot'] as const
const AI_BOTS_SECONDARY = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'Google-Extended',
  'Applebot-Extended',
  'anthropic-ai',
  'meta-externalagent',
  'Bytespider',
  'Amazonbot',
  'cohere-ai',
  'YouBot',
] as const
const MAX_AI_BOTS_PENALTY = 6

const QUESTION_STARTERS =
  /^(qu[iemo]|comment|pourquoi|où|quand|quel|quelle|quels|quelles|que|what|how|why|when|where|which|who|is|are|do|does|can)\b/i

const HEDGING_PATTERNS =
  /\b(peut[- ]être|il semble que|pourrait être|pourrait peut[- ]être|possiblement|probablement|\bil est possible que\b|maybe|perhaps|might be|seems to be)\b/gi

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
}

/**
 * Parse a `robots.txt` and tell whether the given bot is globally disallowed.
 * A bot is disallowed when one of its User-agent blocks (or the wildcard `*`
 * block, when the bot has no explicit block) contains `Disallow: /`.
 */
export function isBotDisallowed(robotsTxt: string, botName: string): boolean {
  const lines = robotsTxt
    .split('\n')
    .map((l) => l.split('#')[0].trim())
    .filter(Boolean)

  const blocks: Array<{ agents: string[]; disallows: string[] }> = []
  let current: { agents: string[]; disallows: string[] } | null = null
  let expectingAgents = true

  for (const line of lines) {
    const lower = line.toLowerCase()
    if (lower.startsWith('user-agent:')) {
      const agent = line.slice('user-agent:'.length).trim()
      if (!expectingAgents || !current) {
        current = { agents: [], disallows: [] }
        blocks.push(current)
        expectingAgents = true
      }
      current.agents.push(agent)
    } else if (lower.startsWith('disallow:')) {
      expectingAgents = false
      if (!current) {
        current = { agents: [], disallows: [] }
        blocks.push(current)
      }
      current.disallows.push(line.slice('disallow:'.length).trim())
    } else if (lower.startsWith('allow:') || lower.startsWith('sitemap:') || lower.startsWith('crawl-delay:')) {
      expectingAgents = false
    }
  }

  const botLower = botName.toLowerCase()
  const explicit = blocks.find((b) =>
    b.agents.some((a) => a.toLowerCase() === botLower),
  )
  if (explicit) {
    return explicit.disallows.includes('/')
  }
  // Fall back to wildcard
  const wildcard = blocks.find((b) => b.agents.some((a) => a === '*'))
  return wildcard ? wildcard.disallows.includes('/') : false
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => /[\w\u00C0-\u024F]/.test(w)).length
}

function extractFirstMeaningfulParagraph($: cheerio.CheerioAPI): string {
  const paragraphs = $('main p, article p, body > p, section p')
    .toArray()
    .map((el) => $(el).text().trim())
    .filter((t) => t.length > 0)

  if (paragraphs.length === 0) {
    // Fallback on any <p>
    const fallback = $('p')
      .toArray()
      .map((el) => $(el).text().trim())
      .filter((t) => t.length > 0)
    return fallback[0] ?? ''
  }

  return paragraphs[0]
}

function normalizeHeading(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function isQuestion(heading: string): boolean {
  const trimmed = heading.trim()
  if (trimmed.endsWith('?')) return true
  return QUESTION_STARTERS.test(trimmed)
}

type JsonLdObject = Record<string, unknown>

function extractFlatJsonLd(html: string): JsonLdObject[] {
  const $ = cheerio.load(html)
  const out: JsonLdObject[] = []
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text().trim()
    if (!raw) return
    try {
      const visit = (node: unknown) => {
        if (!node || typeof node !== 'object') return
        if (Array.isArray(node)) return node.forEach(visit)
        const o = node as JsonLdObject
        if (Array.isArray(o['@graph'])) return (o['@graph'] as unknown[]).forEach(visit)
        out.push(o)
      }
      visit(JSON.parse(raw))
    } catch {
      /* ignore */
    }
  })
  return out
}

function hasJsonLdType(objects: JsonLdObject[], type: string): boolean {
  return objects.some((o) => {
    const t = o['@type']
    const types = Array.isArray(t) ? t.map(String) : t ? [String(t)] : []
    return types.some((x) => x.toLowerCase() === type.toLowerCase())
  })
}

function h2WithoutShortAnswer($: cheerio.CheerioAPI): number {
  let missing = 0
  $('h2').each((_, el) => {
    let next = $(el).next()
    while (next.length > 0 && !next.is('p')) {
      next = next.next()
    }
    if (next.length === 0 || !next.is('p')) {
      missing += 1
      return
    }
    const words = countWords(next.text())
    if (words > 60 || words === 0) {
      missing += 1
    }
  })
  return missing
}

export async function runGeoPhase(
  snapshot: CrawlSnapshot,
): Promise<PhaseResult> {
  const findings: Finding[] = []
  let score = SCORE_MAX
  const $ = cheerio.load(snapshot.html)
  const finalUrl = snapshot.finalUrl

  const pushCheck = (check: CheckSpec) => {
    findings.push({
      phaseKey: PHASE_KEY,
      severity: check.severity,
      category: check.category,
      title: check.title,
      description: check.description,
      recommendation: check.recommendation,
      pointsLost: check.pointsLost,
      effort: check.effort,
      locationUrl: finalUrl,
      metricValue: check.metricValue,
      metricTarget: check.metricTarget,
    })
    score -= check.pointsLost
  }

  // --- 1. /llms.txt -------------------------------------------------------
  if (!snapshot.llmsTxt) {
    pushCheck({
      severity: 'high',
      category: 'geo-llms-txt',
      title: 'llms.txt absent',
      description:
        'Le fichier `/llms.txt` est la convention émergente pour exposer un résumé Markdown du site à destination des moteurs IA (ChatGPT Search, Perplexity, Claude, Google AI Overviews).',
      recommendation:
        'Publier un fichier `/llms.txt` à la racine : `# Titre du site`, `> Description courte`, puis des sections listant les URLs clés avec descriptions.',
      pointsLost: 4,
      effort: 'medium',
    })
  } else {
    const hasTitle = /^#\s+\S/m.test(snapshot.llmsTxt)
    const hasDescription = /^>\s+\S/m.test(snapshot.llmsTxt)
    if (!hasTitle || !hasDescription) {
      pushCheck({
        severity: 'low',
        category: 'geo-llms-txt',
        title: 'llms.txt format Markdown incomplet',
        description:
          'Le fichier existe mais manque le titre `# ...` ou la description `> ...` attendus par la convention.',
        recommendation:
          'Reprendre la structure de référence : `# Titre`, `> Description`, puis sections avec liens et courtes descriptions.',
        pointsLost: 1,
        effort: 'quick',
      })
    }
  }

  // --- 2. AI bots robots.txt ---------------------------------------------
  if (snapshot.robotsTxt) {
    let botsPenalty = 0
    const blockedPrimary: string[] = []
    const blockedSecondary: string[] = []
    for (const bot of AI_BOTS_PRIMARY) {
      if (isBotDisallowed(snapshot.robotsTxt, bot)) {
        blockedPrimary.push(bot)
        botsPenalty = Math.min(MAX_AI_BOTS_PENALTY, botsPenalty + 2)
      }
    }
    for (const bot of AI_BOTS_SECONDARY) {
      if (isBotDisallowed(snapshot.robotsTxt, bot)) {
        blockedSecondary.push(bot)
        botsPenalty = Math.min(MAX_AI_BOTS_PENALTY, botsPenalty + 1)
      }
    }
    const blockedBots = [...blockedPrimary, ...blockedSecondary]
    if (blockedBots.length > 0) {
      const severity =
        blockedPrimary.length > 0
          ? 'critical'
          : blockedSecondary.length >= 3
            ? 'high'
            : 'medium'
      pushCheck({
        severity,
        category: 'geo-ai-bots',
        title: `Bots IA bloqués par robots.txt (${blockedBots.length})`,
        description: `Le robots.txt exclut ${blockedBots.join(', ')} — ces bots collectent le contenu pour alimenter les réponses des moteurs IA. Bloquer = invisible pour les moteurs correspondants.`,
        recommendation:
          'Retirer les règles `Disallow: /` sur les bots souhaités. En 2026, les bots majeurs à autoriser par défaut : GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended, Applebot-Extended.',
        pointsLost: botsPenalty,
        effort: 'quick',
        metricValue: blockedBots.join(', '),
      })
    }
  }

  // --- 3. Semantic completeness (homepage) -------------------------------
  const firstPara = extractFirstMeaningfulParagraph($)
  const firstParaWords = countWords(firstPara)
  if (firstParaWords === 0) {
    pushCheck({
      severity: 'high',
      category: 'geo-semantic',
      title: 'Pas de paragraphe introductif',
      description:
        'La page ne contient aucun paragraphe. Les moteurs IA s\'appuient sur le premier paragraphe pour comprendre en une phrase ce qu\'est le site.',
      recommendation:
        'Ajouter un paragraphe de 134 à 167 mots en haut de la page, auto-suffisant, qui explique ce que fait le site, pour qui, avec quelles différences clés.',
      pointsLost: 2,
      effort: 'medium',
    })
  } else if (firstParaWords < 134) {
    pushCheck({
      severity: 'medium',
      category: 'geo-semantic',
      title: 'Premier paragraphe trop court',
      description:
        'Pour être réutilisable par un moteur IA (snippet, résumé), le premier paragraphe doit être auto-suffisant, typiquement 134-167 mots. Ici il est trop court.',
      recommendation:
        'Étendre le premier paragraphe à 134-167 mots en intégrant les entités clés (marque, offre, public cible, valeur).',
      pointsLost: 2,
      effort: 'medium',
      metricValue: `${firstParaWords} mots`,
      metricTarget: '134–167 mots',
    })
  } else if (firstParaWords > 167) {
    pushCheck({
      severity: 'low',
      category: 'geo-semantic',
      title: 'Premier paragraphe trop long',
      description:
        'Au-delà de 167 mots, le paragraphe devient difficile à réutiliser tel quel dans une réponse IA.',
      recommendation: 'Condenser entre 134 et 167 mots.',
      pointsLost: 1,
      effort: 'quick',
      metricValue: `${firstParaWords} mots`,
      metricTarget: '134–167 mots',
    })
  }

  // --- 4. Answer block patterns (H2 questions + short answers) ------------
  const h2List = $('h2')
    .toArray()
    .map((el) => normalizeHeading($(el).text()))
    .filter((h) => h.length > 0)

  if (h2List.length >= 3) {
    const questionCount = h2List.filter(isQuestion).length
    const ratio = questionCount / h2List.length
    if (ratio < 0.6) {
      pushCheck({
        severity: 'medium',
        category: 'geo-answer-blocks',
        title: 'H2 rarement formulés en questions',
        description:
          'Les moteurs IA extraient en priorité les réponses à des questions. Avoir des H2 formulés comme des questions (qui/quoi/comment/pourquoi ou finissant par `?`) augmente la probabilité d\'être cité.',
        recommendation:
          'Convertir ≥ 60 % des H2 en questions. Ex: "Nos services" → "Comment nos services répondent à vos besoins ?"',
        pointsLost: 1,
        effort: 'medium',
        metricValue: `${Math.round(ratio * 100)} %`,
        metricTarget: '≥ 60 %',
      })
    }
    const missing = h2WithoutShortAnswer($)
    if (missing / h2List.length > 0.5) {
      pushCheck({
        severity: 'low',
        category: 'geo-answer-blocks',
        title: 'Réponse courte manquante sous les H2',
        description:
          'Un pattern efficace pour être cité : chaque H2 suivi d\'une réponse courte (< 60 mots) qui résume la section.',
        recommendation:
          'Ajouter un paragraphe de réponse court (< 60 mots) directement après chaque H2, avant le contenu détaillé.',
        pointsLost: 0.5,
        effort: 'medium',
        metricValue: `${missing}/${h2List.length} H2 sans réponse courte`,
      })
    }
  }

  // --- 5. Evidence density (quantifiable signals) -------------------------
  const bodyText = $('body').text()
  const hasStats =
    /\b\d+\s*%|\b\d{2,}\s*(?:utilisateurs|clients|entreprises|employé|euros|€|\$|dollars|millions|milliards)\b/i.test(
      bodyText,
    )
  const bodyWords = countWords(bodyText)
  if (!hasStats && bodyWords > 300) {
    pushCheck({
      severity: 'low',
      category: 'geo-evidence',
      title: 'Contenu sans evidence quantifiée',
      description:
        'Les moteurs IA privilégient les contenus avec des faits mesurables (pourcentages, chiffres, sources datées). Aucune stat détectée sur cette page.',
      recommendation:
        'Intégrer au moins 2-3 données chiffrées (%, nombres d\'utilisateurs, résultats) idéalement avec la source.',
      pointsLost: 1,
      effort: 'medium',
    })
  }

  // --- 6. FAQPage / HowTo schemas (citation magnets) ---------------------
  const jsonLd = extractFlatJsonLd(snapshot.html)
  const hasFaqPage = hasJsonLdType(jsonLd, 'FAQPage')
  const hasHowTo = hasJsonLdType(jsonLd, 'HowTo')
  const hasQAPage = hasJsonLdType(jsonLd, 'QAPage')

  const looksInstructional =
    /\/(guide|tutoriel|comment|how[- ]to|step|instructions)\b/i.test(finalUrl)
  const h2QuestionsPresent = $('h2')
    .toArray()
    .some((el) => {
      const txt = $(el).text().trim()
      return /[?]\s*$/.test(txt) || QUESTION_STARTERS.test(txt)
    })

  if (!hasFaqPage && !hasQAPage && h2QuestionsPresent) {
    pushCheck({
      severity: 'medium',
      category: 'geo-faqpage-schema',
      title: 'FAQPage schema absent malgré des H2 en questions',
      description:
        'La page contient des H2 formulés en questions mais aucun schema FAQPage (ou QAPage) n\'est déclaré. FAQPage est un des formats les plus cités par les AI Overviews et ChatGPT Search.',
      recommendation:
        'Encapsuler les paires question/réponse dans un JSON-LD FAQPage : `{ "@type": "FAQPage", "mainEntity": [{ "@type": "Question", "name": "...", "acceptedAnswer": { "@type": "Answer", "text": "..." } }] }`.',
      pointsLost: 1,
      effort: 'medium',
    })
  }

  if (looksInstructional && !hasHowTo) {
    pushCheck({
      severity: 'low',
      category: 'geo-howto-schema',
      title: 'Page instructionnelle sans schema HowTo',
      description:
        'L\'URL suggère une page guide/tutoriel mais aucun schema HowTo n\'est présent. HowTo structure clairement étapes + durée + matériel pour les moteurs IA.',
      recommendation:
        'Ajouter un JSON-LD HowTo avec `step`, `totalTime`, éventuellement `supply` et `tool`. Chaque step = `{ "@type": "HowToStep", "text": "..." }`.',
      pointsLost: 0.5,
      effort: 'medium',
    })
  }

  // --- 7. Citable quotes (blockquote density) -----------------------------
  const blockquotes = $('blockquote').length
  const qTags = $('q').length
  const citeTags = $('cite').length
  const citableElements = blockquotes + qTags + citeTags
  if (bodyWords >= 800 && citableElements === 0) {
    pushCheck({
      severity: 'low',
      category: 'geo-citable-content',
      title: 'Aucun contenu citable structuré (blockquote / q / cite)',
      description:
        'Les moteurs IA favorisent l\'extraction de passages balisés comme citations (<blockquote>, <q>, <cite>). Un long contenu sans blocs citables se fait moins souvent reprendre verbatim.',
      recommendation:
        'Encadrer les phrases-clé ou les citations d\'experts dans des <blockquote> avec <cite> pour la source. Exemple : `<blockquote><p>La GEO dépasse 30 % des requêtes en 2026.</p><cite>Gartner, 2026</cite></blockquote>`.',
      pointsLost: 0.5,
      effort: 'quick',
      metricValue: '0 blockquote / q / cite',
    })
  }

  // --- 8. Semantic HTML5 structure ----------------------------------------
  const semanticTagsCount =
    $('article').length +
    $('section').length +
    $('main').length +
    $('nav').length +
    $('aside').length +
    $('header').length +
    $('footer').length
  if (bodyWords >= 400 && semanticTagsCount === 0) {
    pushCheck({
      severity: 'medium',
      category: 'geo-semantic-html',
      title: 'Aucune balise HTML5 sémantique',
      description:
        'La page utilise exclusivement des <div>/<span> sans <article>, <section>, <main>, <nav>. Les crawlers et moteurs IA s\'appuient sur la sémantique HTML5 pour identifier le contenu principal vs la navigation.',
      recommendation:
        'Wrapper le contenu principal dans <main><article>, les sections dans <section>, la navigation dans <nav>, le pied de page dans <footer>.',
      pointsLost: 1,
      effort: 'medium',
    })
  }

  // --- 9. llms-full.txt (extended convention) -----------------------------
  if (snapshot.llmsTxt && !snapshot.llmsFullTxt) {
    pushCheck({
      severity: 'info',
      category: 'geo-llms-full-txt',
      title: 'llms-full.txt absent (bonus GEO)',
      description:
        'Convention étendue à `/llms.txt` : `/llms-full.txt` expose le contenu complet du site en un seul fichier Markdown, à destination des moteurs IA qui veulent ingérer tout le contexte d\'un coup.',
      recommendation:
        'Générer un `/llms-full.txt` qui concatène les pages clés en Markdown (Mintlify, Readme.com proposent des outils). Optionnel mais bien vu.',
      pointsLost: 0,
      effort: 'medium',
    })
  }

  // --- 10. Authoritative tone — hedging (info only) ----------------------
  const hedgingMatches = bodyText.match(HEDGING_PATTERNS) ?? []
  if (hedgingMatches.length >= 4) {
    pushCheck({
      severity: 'info',
      category: 'geo-tone',
      title: 'Formules d\'incertitude fréquentes',
      description: `${hedgingMatches.length} occurrences de formulations hedging détectées ("peut-être", "il semble que"…). Les moteurs IA citent plus volontiers les contenus au ton affirmé.`,
      recommendation:
        'Reformuler les passages concernés en affirmations directes, appuyées sur des faits ou des cas clients.',
      pointsLost: 0,
      effort: 'medium',
      metricValue: `${hedgingMatches.length} occurrences`,
    })
  }

  score = Math.max(0, Math.min(SCORE_MAX, score))

  return {
    phaseKey: PHASE_KEY,
    score,
    scoreMax: SCORE_MAX,
    status: 'completed',
    summary: `Phase GEO — ${findings.length} constat${findings.length > 1 ? 's' : ''}, score ${score}/${SCORE_MAX}`,
    findings,
  }
}

export const GEO_SCORE_MAX = SCORE_MAX
