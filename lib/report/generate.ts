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
    --bg: #eef0f5;
    --surface: #ffffff;
    --border: #e2e8f0;
    --border-light: #f1f5f9;
    --text: #0f172a;
    --text-body: #1e293b;
    --muted: #64748b;
    --green: #059669;
    --green-bg: #ecfdf5;
    --green-text: #065f46;
    --blue: #2563eb;
    --blue-bg: #eff6ff;
    --blue-text: #1e3a8a;
    --amber: #d97706;
    --amber-bg: #fffbeb;
    --amber-text: #78350f;
    --red: #dc2626;
    --red-bg: #fef2f2;
    --red-text: #7f1d1d;
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--bg);
    color: var(--text-body);
    margin: 0;
    line-height: 1.7;
    font-size: 15px;
    -webkit-font-smoothing: antialiased;
  }
  .report {
    max-width: 820px;
    margin: 32px auto 64px;
    background: var(--surface);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 24px 64px rgba(0,0,0,0.1);
  }
  /* ── Cover ── */
  .cover {
    background: linear-gradient(145deg, #0f172a 0%, #1e1b4b 55%, #312e81 100%);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    padding: 52px 56px 44px;
    text-align: center;
    color: #fff;
  }
  .cover .eyebrow {
    display: inline-block;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: #a5b4fc;
    margin-bottom: 18px;
  }
  .cover h1 {
    font-size: 2.5rem;
    font-weight: 800;
    color: #fff;
    margin: 0 0 10px;
    letter-spacing: -0.03em;
    line-height: 1.15;
  }
  .cover .target {
    font-size: 0.9rem;
    color: #94a3b8;
    margin-bottom: 28px;
    letter-spacing: 0.01em;
  }
  .score-ribbon {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 13px 30px;
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 100px;
    color: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .score-ribbon.level-green { background: rgba(5,150,105,0.9); border-color: rgba(5,150,105,0.6); }
  .score-ribbon.level-blue  { background: rgba(37,99,235,0.9);  border-color: rgba(37,99,235,0.6); }
  .score-ribbon.level-amber { background: rgba(217,119,6,0.9);  border-color: rgba(217,119,6,0.6); }
  .score-ribbon.level-red   { background: rgba(220,38,38,0.9);  border-color: rgba(220,38,38,0.6); }
  .score-ribbon strong { font-size: 2rem; font-weight: 800; line-height: 1; }
  .score-ribbon .slash { font-size: 0.88rem; opacity: 0.7; }
  .score-ribbon .level-label { font-size: 0.9rem; font-weight: 600; opacity: 0.92; }
  .cover .meta {
    margin-top: 22px;
    font-size: 0.78rem;
    color: #64748b;
  }
  .brand-logo {
    max-height: 40px;
    max-width: 160px;
    margin: 0 auto 20px;
    display: block;
    filter: brightness(0) invert(1);
  }
  /* ── Body ── */
  .report-body {
    padding: 44px 56px 40px;
  }
  h1, h2, h3, h4 {
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text);
    margin-top: 0;
  }
  h2 {
    font-size: 1.3rem;
    font-weight: 700;
    margin: 2.4rem 0 1rem;
    padding-bottom: 0.6rem;
    border-bottom: 2px solid var(--border-light);
  }
  h3 {
    font-size: 1.05rem;
    font-weight: 600;
    margin: 1.8rem 0 0.5rem;
    color: var(--text);
  }
  p { margin: 0.5rem 0 0.8rem; color: var(--text-body); }
  strong { color: var(--text); }
  /* ── Tables ── */
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 14px 0 24px;
    font-size: 0.875rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
  }
  thead { background: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  th {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--muted);
    padding: 10px 14px;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }
  td {
    padding: 10px 14px;
    border-top: 1px solid var(--border-light);
    color: var(--text-body);
    vertical-align: top;
  }
  tbody tr:nth-child(even) td { background: #fafbfc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  /* ── Lists ── */
  ul { padding-left: 0; list-style: none; margin: 8px 0 12px; }
  li { padding: 5px 0 5px 22px; position: relative; line-height: 1.6; }
  li::before { content: '›'; position: absolute; left: 6px; color: var(--brand-primary); font-weight: 700; font-size: 1.1em; line-height: 1.4; }
  /* ── Code ── */
  code {
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.82em;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    color: #4338ca;
  }
  hr { border: none; border-top: 1px solid var(--border); margin: 28px 0; }
  /* ── Footer ── */
  footer {
    margin: 0 56px;
    padding: 20px 0 36px;
    border-top: 1px solid var(--border);
    font-size: 0.77rem;
    color: var(--muted);
    text-align: center;
  }
  /* ── Print / PDF ── */
  @media print {
    body { background: #fff; }
    .report { box-shadow: none; border-radius: 0; margin: 0; max-width: none; }
    .cover {
      break-after: page;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .report-body { padding: 32px 40px; }
    footer { margin: 0 40px; padding: 16px 0 24px; }
    h2 { break-after: avoid; }
    h3 { break-after: avoid; page-break-after: avoid; }
    table { break-inside: avoid; }
    li { break-inside: avoid; }
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

function coverTitle(audit: ReportInput['audit']): string {
  if (audit.clientName?.trim()) return escapeHtml(audit.clientName.trim())
  if (audit.targetUrl) {
    try {
      return escapeHtml(new URL(audit.targetUrl).hostname.replace(/^www\./, ''))
    } catch {
      return escapeHtml(audit.targetUrl)
    }
  }
  return 'Rapport SEO & GEO'
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
  const targetDisplay = audit.targetUrl
    ? `<div class="target">${escapeHtml(audit.targetUrl)}</div>`
    : ''
  return `
  <section class="cover">
    ${logoHtml}
    <div class="eyebrow">Audit SEO &amp; GEO</div>
    <h1>${coverTitle(audit)}</h1>
    ${targetDisplay}
    <div class="score-ribbon level-${level.color}">
      <strong>${score}</strong><span class="slash">&nbsp;/&nbsp;100</span>
      <span class="level-label">· ${escapeHtml(level.label)}</span>
    </div>
    <div class="meta">
      ${escapeHtml(formatDateFr(audit.finishedAt))}${audit.consultantName ? ` · par ${escapeHtml(audit.consultantName)}` : ''}
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
<title>Audit SEO &amp; GEO — ${escapeHtml(audit.clientName ?? audit.targetUrl ?? '')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${styles}</style>
</head>
<body>
<div class="report">
  ${cover}
  <div class="report-body">
    ${renderedBody}
  </div>
  <footer>Audit généré par ${escapeHtml(companyName)} · ${escapeHtml(formatDateFr(audit.finishedAt))}</footer>
</div>
</body>
</html>`

  return { markdown: normalizedMarkdown, html, templateVersion: TEMPLATE_VERSION }
}
