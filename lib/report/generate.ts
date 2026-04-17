/**
 * Report generator. Assembles the Markdown template, renders to HTML, returns
 * both. Pure function — no DB access. Callers persist the result.
 */
import { PHASE_LABELS_FR, formatDateFr, scoreLevel } from './labels'
import { capitalizeProperNouns } from './proper-nouns'
import {
  buildExecutiveSummary,
  buildHotspotUrls,
  buildQuickWins,
  buildRoadmap,
  buildScoreBreakdown,
  buildStrengths,
  buildTop5Issues,
  buildWeaknesses,
  computePotentialGain,
  type ReportBranding,
  type ReportInput,
} from './render'

export interface GeneratedReport {
  markdown: string
  html: string
  templateVersion: string
}

const TEMPLATE_VERSION = 'v1.1'

const DEFAULT_PRIMARY = '#4F46E5'
const DEFAULT_SECONDARY = '#7C3AED'

/**
 * Sanity-check une couleur fournie par le client. Accepte `#rgb`, `#rrggbb`.
 * Rejette tout ce qui pourrait injecter du CSS (`;`, `{`, `url(`, …).
 */
function safeColor(input: string | null | undefined, fallback: string): string {
  if (!input) return fallback
  const v = input.trim()
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ? v : fallback
}

function buildStyles(branding: ReportBranding | null | undefined): string {
  const primary = safeColor(branding?.primaryColor, DEFAULT_PRIMARY)
  const secondary = safeColor(branding?.accentColor, DEFAULT_SECONDARY)
  return `
  :root {
    --brand-primary: ${primary};
    --brand-secondary: ${secondary};
    --bg: #f4f6f9;
    --surface: #ffffff;
    --border: #dfe4ea;
    --text: #1a1e2c;
    --muted: #5c6a7e;
    --green: #10b981;
    --blue: #3b82f6;
    --amber: #f59e0b;
    --red: #ef4444;
  }
  body {
    font-family: 'Fira Code', 'JetBrains Mono', monospace;
    background: var(--bg);
    color: var(--text);
    margin: 0;
    line-height: 1.55;
  }
  .report {
    max-width: 760px;
    margin: 40px auto;
    padding: 40px 48px;
    background: var(--surface);
    border-radius: 18px;
    border: 1px solid var(--border);
    box-shadow: 0 10px 40px rgba(0,0,0,0.04);
  }
  h1, h2, h3 {
    font-family: 'Cabinet Grotesk', 'Inter', sans-serif;
    letter-spacing: -0.015em;
  }
  h1 { font-size: 2.1rem; margin-top: 0; }
  h2 { font-size: 1.45rem; margin-top: 2.2rem; padding-bottom: 0.35rem; border-bottom: 1px solid var(--border); }
  h3 { font-size: 1.1rem; margin-top: 1.6rem; }
  .cover {
    text-align: center;
    padding: 48px 24px 40px;
    background: linear-gradient(135deg, rgba(79,70,229,0.08), rgba(124,58,237,0.08));
    border-radius: 14px;
    margin-bottom: 32px;
  }
  .cover .eyebrow {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--brand-primary);
    font-family: 'Cabinet Grotesk', 'Inter', sans-serif;
    font-weight: 600;
  }
  .cover h1 {
    font-size: 2.4rem;
    margin: 8px 0 4px;
  }
  .cover .target {
    font-size: 0.95rem;
    color: var(--muted);
  }
  .cover .meta {
    margin-top: 26px;
    font-size: 0.85rem;
    color: var(--muted);
  }
  .score-ribbon {
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
    padding: 10px 20px;
    margin: 16px auto;
    background: var(--brand-primary);
    color: #fff;
    border-radius: 999px;
    font-family: 'Cabinet Grotesk', 'Inter', sans-serif;
  }
  .score-ribbon.level-green { background: var(--green); }
  .score-ribbon.level-blue { background: var(--blue); }
  .score-ribbon.level-amber { background: var(--amber); color: #1a1a1a; }
  .score-ribbon.level-red { background: var(--red); }
  .score-ribbon strong { font-size: 1.8rem; font-weight: 700; }
  .score-ribbon .slash { opacity: 0.8; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0 20px; font-size: 0.9rem; }
  th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--border); }
  th { font-family: 'Cabinet Grotesk', 'Inter', sans-serif; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.75rem; color: var(--muted); font-weight: 600; }
  code { background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px; font-size: 0.85em; }
  hr { border: none; border-top: 1px solid var(--border); margin: 24px 0; }
  ul { padding-left: 20px; }
  li { margin-bottom: 6px; }
  footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
    font-size: 0.8rem;
    color: var(--muted);
    text-align: center;
  }
  .brand-logo {
    max-height: 48px;
    max-width: 220px;
    margin: 0 auto 14px;
    display: block;
  }
  @media print {
    body { background: #fff; }
    .report { box-shadow: none; border: none; margin: 0; padding: 32px; max-width: none; border-radius: 0; }
    .cover { break-after: page; }
    h2 { break-after: avoid; }
    h3 { break-after: avoid; }
  }
`
}

/**
 * Escape basique pour attributs HTML (cover logoUrl, company name). Empêche
 * l'injection de guillemets / chevrons dans les valeurs issues du branding
 * saisi par le client.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function safeLogoUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!/^https?:\/\//i.test(trimmed)) return null
  return trimmed
}

function buildCoverHtml(
  audit: ReportInput['audit'],
  branding: ReportBranding | null | undefined,
): string {
  const score = Math.round(audit.scoreTotal ?? 0)
  const level = scoreLevel(score)
  const logo = safeLogoUrl(branding?.logoUrl)
  const logoHtml = logo
    ? `<img class="brand-logo" src="${escapeHtml(logo)}" alt="${escapeHtml(branding?.companyName ?? '')}" />`
    : ''
  return `
  <section class="cover">
    ${logoHtml}
    <div class="eyebrow">Audit SEO & GEO</div>
    <h1>${audit.clientName ?? 'Audit'}</h1>
    <div class="target">${audit.targetUrl ?? ''}</div>
    <div class="score-ribbon level-${level.color}">
      <strong>${score}</strong><span class="slash">/ 100</span>
      <span>· ${level.label}</span>
    </div>
    <div class="meta">
      ${formatDateFr(audit.finishedAt)}${audit.consultantName ? ` · par ${audit.consultantName}` : ''}
    </div>
  </section>`
}

function markdownToHtml(md: string): string {
  // Minimal transformer (headings, bold, italics, lists, tables, hr). Enough
  // for our Markdown templates — no user-input risk so raw HTML escaping
  // concerns are low. Escape user-injected fields upstream if ever needed.
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const lines = md.split('\n')
  const out: string[] = []
  let inList = false
  let inTable = false
  let tableHeaderSeen = false

  const flushList = () => {
    if (inList) {
      out.push('</ul>')
      inList = false
    }
  }
  const flushTable = () => {
    if (inTable) {
      out.push('</tbody></table>')
      inTable = false
      tableHeaderSeen = false
    }
  }

  const renderInline = (text: string): string => {
    let s = esc(text)
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    s = s.replace(/(^|\s)_([^_\n]+)_/g, '$1<em>$2</em>')
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
    return s
  }

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '')

    if (/^---+\s*$/.test(line)) {
      flushList()
      flushTable()
      out.push('<hr>')
      continue
    }
    if (/^###\s+/.test(line)) {
      flushList()
      flushTable()
      out.push(`<h3>${renderInline(line.replace(/^###\s+/, ''))}</h3>`)
      continue
    }
    if (/^##\s+/.test(line)) {
      flushList()
      flushTable()
      out.push(`<h2>${renderInline(line.replace(/^##\s+/, ''))}</h2>`)
      continue
    }
    if (/^#\s+/.test(line)) {
      flushList()
      flushTable()
      out.push(`<h1>${renderInline(line.replace(/^#\s+/, ''))}</h1>`)
      continue
    }
    if (/^\s*- /.test(line)) {
      flushTable()
      if (!inList) {
        out.push('<ul>')
        inList = true
      }
      out.push(`<li>${renderInline(line.replace(/^\s*- /, ''))}</li>`)
      continue
    }
    if (/^\|.+\|$/.test(line)) {
      flushList()
      if (!inTable) {
        out.push('<table><thead>')
        inTable = true
        tableHeaderSeen = false
      }
      if (/^\|[\s:\-|]+\|$/.test(line)) {
        out.push('</thead><tbody>')
        tableHeaderSeen = true
        continue
      }
      const cells = line
        .slice(1, -1)
        .split('|')
        .map((c) => renderInline(c.trim()))
      const tag = tableHeaderSeen ? 'td' : 'th'
      out.push('<tr>' + cells.map((c) => `<${tag}>${c}</${tag}>`).join('') + '</tr>')
      continue
    }
    if (line.trim() === '') {
      flushList()
      flushTable()
      out.push('')
      continue
    }
    flushList()
    flushTable()
    out.push(`<p>${renderInline(line)}</p>`)
  }
  flushList()
  flushTable()
  return out.join('\n')
}

export function generateReport(input: ReportInput): GeneratedReport {
  const { audit, phases, findings } = input
  const score = Math.round(audit.scoreTotal ?? 0)
  const level = scoreLevel(score)
  const gain = computePotentialGain(findings)
  const breakdown = buildScoreBreakdown(phases)
  const top5 = buildTop5Issues(findings)
  const quickWins = buildQuickWins(findings)
  const strengths = buildStrengths(phases)
  const weaknesses = buildWeaknesses(phases)
  const roadmap = buildRoadmap(findings)
  const executive = buildExecutiveSummary(input)
  const hotspots = buildHotspotUrls(findings)

  const phaseContextLines = phases
    .filter((p) => p.phaseKey !== 'synthesis')
    .map((p) => {
      const label = PHASE_LABELS_FR[p.phaseKey] ?? p.phaseKey
      return `- **${label}** : ${p.summary ?? 'Pas de résumé.'}`
    })
    .join('\n')

  const markdown = `# Audit SEO & GEO — ${audit.clientName ?? audit.targetUrl ?? 'Résultats'}

## Synthèse

Votre site ${audit.targetUrl ?? ''} obtient un score global de **${score}/100** — niveau « ${level.label} ».

${executive}

**Forces principales** :

${strengths}

**Axes d'amélioration prioritaires** :

${weaknesses}

**Gain potentiel estimé** : entre ${gain.min} et ${gain.max} points sur 90 jours si la roadmap ci-dessous est mise en œuvre.

## Scoring détaillé

${breakdown}

### Résumé par phase

${phaseContextLines}

${hotspots ? `## Pages à fort enjeu

Ces URLs concentrent plusieurs constats sur plusieurs phases — prioriser leur optimisation donne un gain transverse immédiat.

${hotspots}

` : ''}## Les points à corriger en priorité

${top5}

## Victoires rapides (< 1 h chacune)

${quickWins}

## Feuille de route 90 jours

${roadmap}

## Annexes

### Méthodologie

Cet audit couvre 11 phases d'analyse alignées avec les standards 2026 :

1. SEO technique (baseline)
2. Données structurées (schema.org)
3. Optimisation pour moteurs IA (GEO)
4. Identité entité (Wikidata, sameAs)
5. Crédibilité (E-E-A-T signals)
6. Fraîcheur du contenu
7. International (hreflang)
8. Performance (Core Web Vitals)
9. Autorité thématique (pillar + cluster)
10. Erreurs courantes
11. Synthèse

### Contact

${audit.consultantName ? `**${audit.consultantName}**\n` : ''}Audit généré par Wyzlee — seo-geo-orcin.vercel.app
`

  // Pass finale de normalisation : force la casse canonique des noms propres
  // connus (Google, IA, ChatGPT, LCP/INP/CLS, Wikipedia…) dans tout le
  // markdown assemblé. Les URLs et les blocs de code sont préservés.
  const normalizedMarkdown = capitalizeProperNouns(markdown)
  const renderedBody = markdownToHtml(normalizedMarkdown.replace(/^# [^\n]+\n*/, ''))
  const cover = buildCoverHtml(audit, input.branding)
  const styles = buildStyles(input.branding)
  const companyName = input.branding?.companyName?.trim() || 'Wyzlee'

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Audit SEO & GEO — ${audit.clientName ?? audit.targetUrl ?? ''}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${styles}</style>
</head>
<body>
<div class="report">
  ${cover}
  ${renderedBody}
  <footer>Audit généré par ${escapeHtml(companyName)} · ${formatDateFr(audit.finishedAt)}</footer>
</div>
</body>
</html>`

  return { markdown: normalizedMarkdown, html, templateVersion: TEMPLATE_VERSION }
}
