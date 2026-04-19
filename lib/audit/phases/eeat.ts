/**
 * Phase 5 — E-E-A-T Signals (10 pts)
 *
 * Experience / Expertise / Authoritativeness / Trust.
 *
 * V1.5 URL mode :
 *  - HTTPS + HSTS implicite
 *  - Pages trust (About, Contact, Mentions, Privacy) présentes ET
 *    crawlables (statut 2xx via subPages quand on a les données)
 *  - Auteur + Person schema complet (jobTitle + sameAs + knowsAbout)
 *  - Reviewed-by / Fact-checked / Editorial policy
 *  - Citations externes contextualisées (anchor text descriptif)
 *  - Dates visibles
 */
import * as cheerio from 'cheerio'
import type { Finding, PhaseResult, CrawlSnapshot } from '../types'

const SCORE_MAX = 10
const PHASE_KEY = 'eeat' as const

interface CheckSpec {
  severity: Finding['severity']
  category: string
  title: string
  description: string
  recommendation: string
  pointsLost: number
  effort?: Finding['effort']
  metricValue?: string
}

type JsonLdObject = Record<string, unknown>

function extractFlatJsonLd(html: string): JsonLdObject[] {
  const $ = cheerio.load(html)
  const out: JsonLdObject[] = []
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const visit = (node: unknown) => {
        if (!node || typeof node !== 'object') return
        if (Array.isArray(node)) return node.forEach(visit)
        const o = node as JsonLdObject
        if (Array.isArray(o['@graph'])) return (o['@graph'] as unknown[]).forEach(visit)
        out.push(o)
      }
      visit(JSON.parse($(el).text().trim()))
    } catch {
      /* ignore */
    }
  })
  return out
}

function findByType(
  objects: JsonLdObject[],
  type: string,
): JsonLdObject | null {
  return (
    objects.find((o) => {
      const t = o['@type']
      const types = Array.isArray(t) ? t.map(String) : t ? [String(t)] : []
      return types.some((x) => x.toLowerCase() === type.toLowerCase())
    }) ?? null
  )
}

const BARE_URL_REGEX = /^https?:\/\//i

export async function runEeatPhase(
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
    })
    score -= check.pointsLost
  }

  const objects = extractFlatJsonLd(snapshot.html)

  // --- Trust : HTTPS ------------------------------------------------------
  if (!finalUrl.startsWith('https://')) {
    pushCheck({
      severity: 'critical',
      category: 'eeat-https',
      title: 'Site servi en HTTP (pas HTTPS)',
      description:
        'HTTPS est un signal de trust fondamental. Sans lui, Google rétrograde le site et tous les navigateurs affichent un warning "non sécurisé".',
      recommendation:
        'Activer un certificat TLS (Let\'s Encrypt gratuit), forcer la redirection HTTP → HTTPS, ajouter HSTS.',
      pointsLost: 3,
      effort: 'medium',
    })
  }

  // --- Trust : About / Contact / Legal / Privacy pages -------------------
  const allAnchors = $('a')
    .toArray()
    .map((el) => ({
      href: ($(el).attr('href') ?? '').toLowerCase(),
      text: $(el).text().toLowerCase(),
    }))

  const linkMatches = (keywords: string[]) =>
    allAnchors.some((a) =>
      keywords.some((k) => a.href.includes(k) || a.text.includes(k)),
    )

  const trustPages = [
    { name: 'About', keywords: ['about', 'a-propos', 'qui-sommes', 'equipe'] },
    { name: 'Contact', keywords: ['contact'] },
    {
      name: 'Mentions légales / Legal',
      keywords: ['mentions', 'legal', 'legales'],
    },
    { name: 'Privacy / Confidentialité', keywords: ['privacy', 'confidentialite'] },
  ]
  const missingTrust = trustPages.filter((p) => !linkMatches(p.keywords))
  if (missingTrust.length > 0) {
    pushCheck({
      severity: 'medium',
      category: 'eeat-trust-pages',
      title: `Pages de confiance manquantes (${missingTrust.length})`,
      description:
        'Les pages About, Contact, Mentions légales, Privacy sont des signaux de trust minimums. Leur absence en navigation fragilise le E-E-A-T.',
      recommendation: `Exposer les pages suivantes dans le footer : ${missingTrust.map((p) => p.name).join(', ')}.`,
      pointsLost: missingTrust.length * 0.5,
      effort: 'medium',
      metricValue: missingTrust.map((p) => p.name).join(', '),
    })
  }

  // --- Experience : auteur identifié -------------------------------------
  const metaAuthor = $('meta[name="author"]').attr('content')
  const hasAuthor =
    !!metaAuthor ||
    objects.some((o) => {
      const article =
        Array.isArray(o['@type'])
          ? o['@type'].map(String).some((t) => /article|blogposting|newsarticle/i.test(t))
          : o['@type'] &&
            /article|blogposting|newsarticle/i.test(String(o['@type']))
      return article && !!o.author
    })

  const looksEditorial =
    /\/(blog|article|post|news|actualit|journal)\//i.test(finalUrl) ||
    $('article').length > 0

  if (looksEditorial && !hasAuthor) {
    pushCheck({
      severity: 'medium',
      category: 'eeat-author',
      title: 'Auteur non identifié sur la page éditoriale',
      description:
        'Sur une page éditoriale, l\'auteur identifié (meta author + Article.author + bio visible) renforce Experience et Expertise.',
      recommendation:
        'Ajouter `<meta name="author" content="...">`, renseigner `author` dans le JSON-LD Article, afficher un encart auteur + bio.',
      pointsLost: 1,
      effort: 'quick',
    })
  }

  // --- Expertise : Person schema -----------------------------------------
  const personObj = findByType(objects, 'Person')
  if (looksEditorial && !personObj) {
    pushCheck({
      severity: 'low',
      category: 'eeat-person-schema',
      title: 'Schema Person absent sur la page éditoriale',
      description:
        'Un schema `Person` avec `jobTitle`, `sameAs`, `knowsAbout` étoffe l\'Expertise signal pour Google et les moteurs IA.',
      recommendation:
        'Ajouter un JSON-LD Person pour l\'auteur avec `name`, `jobTitle`, `sameAs` (LinkedIn, Twitter), `knowsAbout`.',
      pointsLost: 1,
      effort: 'medium',
    })
  } else if (looksEditorial && personObj) {
    const missing: string[] = []
    if (!personObj.jobTitle) missing.push('jobTitle')
    const sameAs = personObj.sameAs
    const hasSameAs =
      typeof sameAs === 'string' ||
      (Array.isArray(sameAs) && sameAs.length > 0)
    if (!hasSameAs) missing.push('sameAs')
    if (!personObj.knowsAbout) missing.push('knowsAbout')
    if (missing.length >= 2) {
      pushCheck({
        severity: 'low',
        category: 'eeat-person-shallow',
        title: 'Schema Person incomplet',
        description: `Le Person JSON-LD est présent mais manque ${missing.join(', ')}. Ces champs signalent Expertise et identité pro — un Person sans sameAs ni knowsAbout reste un signal faible pour les moteurs IA.`,
        recommendation:
          'Compléter le Person : `jobTitle` (ex: "Consultante SEO senior"), `sameAs` : [LinkedIn, Twitter/X, ORCID], `knowsAbout` : tableau de concepts maîtrisés.',
        pointsLost: 0.5,
        effort: 'quick',
        metricValue: `manque ${missing.join(', ')}`,
      })
    }
  }

  // --- Trust : reviewed-by / fact-checked / editorial policy -------------
  if (looksEditorial) {
    const bodyText = $('body').text().toLowerCase()
    const hasReviewedBy =
      /\breviewed\s+by\b|\brelu\s+par\b|\bvérifié\s+par\b|\bfact[- ]check/i.test(
        bodyText,
      )
    const editorialPolicyLink = allAnchors.some((a) => {
      const target = `${a.href} ${a.text}`
      return /politique[-\s]?éditoriale|editorial[-\s]?policy|m[ée]thodologie|methodology|charte\s+éditoriale/.test(
        target,
      )
    })
    if (!hasReviewedBy && !editorialPolicyLink) {
      pushCheck({
        severity: 'low',
        category: 'eeat-review-policy',
        title: 'Pas de trace de relecture ou de charte éditoriale',
        description:
          'Aucune mention "Relu par / Reviewed by / Fact-checked" ni lien vers une charte éditoriale / méthodologie. Google documente explicitement ces signaux dans ses Quality Rater Guidelines pour YMYL (Your Money Your Life).',
        recommendation:
          'Ajouter une ligne "Relu par [Nom, titre]" en pied d\'article et un lien "Notre méthodologie" en footer pointant vers une page expliquant le process éditorial.',
        pointsLost: 0.5,
        effort: 'medium',
      })
    }
  }

  // --- Authoritativeness : citations externes ----------------------------
  if (looksEditorial) {
    const externalLinks = $('a[href^="http"]')
      .toArray()
      .map((el) => $(el).attr('href') ?? '')
      .filter((href) => {
        try {
          const host = new URL(href).host
          const currentHost = new URL(finalUrl).host
          return host !== currentHost && host !== ''
        } catch {
          return false
        }
      })

    if (externalLinks.length < 3) {
      pushCheck({
        severity: 'low',
        category: 'eeat-citations',
        title: 'Peu de citations externes',
        description:
          'Les pages éditoriales à forte autorité citent des sources externes (études, articles de référence, documentation officielle).',
        recommendation:
          'Ajouter au moins 3 liens externes vers des sources autoritaires pertinentes (études, rapports, documentation).',
        pointsLost: 1,
        effort: 'medium',
        metricValue: `${externalLinks.length} lien(s) externe(s)`,
      })
    }

    // Bare URL detection : "https://example.com" comme anchor text = signal
    // low-effort, moins utile à un lecteur et moins valorisé en crawl.
    if (externalLinks.length >= 3) {
      const bareUrlLinks = $('a[href^="http"]')
        .toArray()
        .filter((el) => {
          const text = $(el).text().trim()
          return BARE_URL_REGEX.test(text)
        })
      const bareRatio = bareUrlLinks.length / externalLinks.length
      if (bareRatio > 0.5 && bareUrlLinks.length >= 3) {
        pushCheck({
          severity: 'low',
          category: 'eeat-bare-urls',
          title: 'Citations externes non contextualisées (URL brutes)',
          description:
            'Plus de 50 % des liens externes utilisent l\'URL brute comme anchor text. Signal low-effort — un anchor descriptif renforce le contexte sémantique et l\'autorité perçue.',
          recommendation:
            'Remplacer les URL brutes par des anchors descriptifs : au lieu de `<a href="...">https://site.com/étude</a>`, écrire `<a href="...">Étude de Site.com sur l\'IA et le SEO</a>`.',
          pointsLost: 0.5,
          effort: 'quick',
          metricValue: `${bareUrlLinks.length}/${externalLinks.length} brutes`,
        })
      }
    }
  }

  // --- Trust : reachability des pages de confiance via subPages ---------
  // Si on a un échantillon multi-page, on vérifie que les URLs trust pointent
  // vers des pages 2xx (pas de 404/500). Seulement quand subPages est dispo
  // (V1.5) ; silencieux sinon.
  const subPages = snapshot.subPages ?? []
  if (subPages.length > 0) {
    const origin = new URL(finalUrl).origin
    const resolveHref = (href: string): string | null => {
      try {
        const u = new URL(href, finalUrl)
        if (u.origin !== origin) return null
        return u.pathname.replace(/\/+$/, '') || '/'
      } catch {
        return null
      }
    }
    const subPageStatusByPath = new Map<string, number>()
    for (const sp of subPages) {
      const path = resolveHref(sp.url)
      if (path) subPageStatusByPath.set(path, sp.status)
    }
    const broken: Array<{ name: string; href: string }> = []
    for (const page of trustPages) {
      const anchor = allAnchors.find((a) =>
        page.keywords.some((k) => a.href.includes(k) || a.text.includes(k)),
      )
      if (!anchor?.href) continue
      const path = resolveHref(anchor.href)
      if (!path) continue
      const status = subPageStatusByPath.get(path)
      if (status !== undefined && status >= 400) {
        broken.push({ name: page.name, href: anchor.href })
      }
    }
    if (broken.length > 0) {
      pushCheck({
        severity: 'high',
        category: 'eeat-trust-broken',
        title: 'Page de confiance cassée (404/500)',
        description: `Les pages suivantes sont linkées mais retournent un code d'erreur : ${broken.map((b) => b.name).join(', ')}. Trust signal directement compromis : un utilisateur ou un crawler tombant sur un 404 sur "Mentions légales" perd toute confiance résiduelle.`,
        recommendation:
          'Rétablir les pages en 2xx ou retirer les liens morts. Si migration en cours, 301 vers les nouvelles URLs.',
        pointsLost: 1,
        effort: 'quick',
        metricValue: broken.map((b) => `${b.name} → ${b.href}`).join(' · '),
      })
    }
  }

  // --- Trust : accessibilité basique (WCAG 2.2) --------------------------
  // Signal Trust E-E-A-T : un site inaccessible fragilise sa crédibilité
  // perçue par Google (QRG) et les moteurs IA.
  const allImgs = $('img').toArray()
  if (allImgs.length >= 3) {
    const missingAlt = allImgs.filter((el) => {
      const alt = $(el).attr('alt')
      return alt === undefined || alt === null
    })
    if (missingAlt.length >= 3 || missingAlt.length / allImgs.length > 0.2) {
      pushCheck({
        severity: 'medium',
        category: 'eeat-a11y-alt',
        title: `Images sans attribut alt (${missingAlt.length}/${allImgs.length})`,
        description:
          'Les images sans `alt` violent WCAG 2.2 critère 1.1.1 et sont ignorées par les screen readers et les moteurs IA. Signal Trust E-E-A-T dégradé.',
        recommendation:
          'Ajouter un `alt` descriptif sur chaque image informative. Pour les images purement décoratives, utiliser `alt=""`.',
        pointsLost: 0.5,
        effort: 'quick',
        metricValue: `${missingAlt.length}/${allImgs.length}`,
      })
    }
  }

  const hasSkipLink =
    $('a[href="#main"], a[href="#main-content"], a[href="#contenu-principal"]')
      .length > 0 ||
    $('a')
      .toArray()
      .some((el) => {
        const href = $(el).attr('href') ?? ''
        const text = $(el).text().toLowerCase()
        return href.startsWith('#') && /\b(skip|aller|contenu|main)\b/i.test(text)
      })
  if (!hasSkipLink) {
    pushCheck({
      severity: 'low',
      category: 'eeat-a11y-skiplink',
      title: 'Lien d\'évitement (skip link) absent',
      description:
        'Aucun lien vers `#main-content` n\'est détecté. Requis par WCAG 2.2 (critère 2.4.1) pour la navigation clavier — signal Trust E-E-A-T indirect.',
      recommendation:
        'Ajouter `<a href="#main-content" class="sr-only focus:not-sr-only">Aller au contenu</a>` en tout début de `<body>`.',
      pointsLost: 0.5,
      effort: 'quick',
    })
  }

  // --- Experience : dates visibles ---------------------------------------
  const hasTimeElement = $('time[datetime]').length > 0
  const hasArticleDates = objects.some((o) => o.datePublished || o.dateModified)
  if (looksEditorial && !hasTimeElement && !hasArticleDates) {
    pushCheck({
      severity: 'low',
      category: 'eeat-dates',
      title: 'Dates de publication / mise à jour non visibles',
      description:
        'Les dates visibles lecteur (via <time datetime>) + JSON-LD Article dates sont un signal Experience direct.',
      recommendation:
        'Ajouter un <time datetime="YYYY-MM-DD"> visible en haut de l\'article + `datePublished` / `dateModified` dans le JSON-LD.',
      pointsLost: 1,
      effort: 'quick',
    })
  }

  score = Math.max(0, Math.min(SCORE_MAX, score))

  return {
    phaseKey: PHASE_KEY,
    score,
    scoreMax: SCORE_MAX,
    status: 'completed',
    summary: `Phase E-E-A-T — ${findings.length} constat${findings.length > 1 ? 's' : ''}, score ${score}/${SCORE_MAX}`,
    findings,
  }
}

export const EEAT_SCORE_MAX = SCORE_MAX
