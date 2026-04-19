/**
 * Report generator. Assembles the HTML directly from structured data.
 * Pure function — no DB access. Callers persist the result.
 */
import {
  EFFORT_LABELS_FR,
  PHASE_CONTEXT_FR,
  PHASE_LABELS_FR,
  SEVERITY_LABELS_FR,
  formatDateFr,
  scoreLevel,
} from './labels'
import { capitalizeProperNouns } from './proper-nouns'
import { dedupeFindings } from './dedup'
import {
  computePotentialGain,
  type ReportBranding,
  type ReportFinding,
  type ReportInput,
  type ReportPhase,
} from './render'
import { PHASE_ORDER, PHASE_SCORE_MAX } from '@/lib/audit/engine'
import type { PhaseKey } from '@/lib/audit/types'

export interface GeneratedReport {
  markdown: string
  html: string
  templateVersion: string
}

const TEMPLATE_VERSION = 'v3.0'

const DEFAULT_PRIMARY = '#ff6b2c'
const DEFAULT_SECONDARY = '#e55a22'

function safeColor(input: string | null | undefined, fallback: string): string {
  if (!input) return fallback
  const v = input.trim()
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ? v : fallback
}

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
  return 'Rapport SEO &amp; GEO'
}

// ── Helpers findings ──────────────────────────────────────────────────────────

function actionableFindings(findings: ReportFinding[]): ReportFinding[] {
  return findings.filter((f) => f.phaseKey !== 'synthesis')
}

const SEVERITY_WEIGHT: Record<ReportFinding['severity'], number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
}

function sortFindings(findings: ReportFinding[]): ReportFinding[] {
  return [...findings].sort((a, b) => {
    const diff = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]
    return diff !== 0 ? diff : b.pointsLost - a.pointsLost
  })
}

function dedupeByRecommendation(findings: ReportFinding[]): ReportFinding[] {
  return dedupeFindings(findings)
}

// ── CSS ───────────────────────────────────────────────────────────────────────

function buildStyles(branding: ReportBranding | null | undefined): string {
  const primary = safeColor(branding?.primaryColor, DEFAULT_PRIMARY)
  const secondary = safeColor(branding?.accentColor, DEFAULT_SECONDARY)
  return `
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&display=swap');

@font-face {
  font-family: 'Cabinet Grotesk';
  src: url('https://seo-geo-orcin.vercel.app/fonts/cabinet-grotesk-400.woff2') format('woff2');
  font-weight: 400; font-style: normal; font-display: block;
}
@font-face {
  font-family: 'Cabinet Grotesk';
  src: url('https://seo-geo-orcin.vercel.app/fonts/cabinet-grotesk-700.woff2') format('woff2');
  font-weight: 700; font-style: normal; font-display: block;
}
@font-face {
  font-family: 'Cabinet Grotesk';
  src: url('https://seo-geo-orcin.vercel.app/fonts/cabinet-grotesk-800.woff2') format('woff2');
  font-weight: 800; font-style: normal; font-display: block;
}
@font-face {
  font-family: 'Cabinet Grotesk';
  src: url('https://seo-geo-orcin.vercel.app/fonts/cabinet-grotesk-900.woff2') format('woff2');
  font-weight: 900; font-style: normal; font-display: block;
}

:root {
  --font-display: 'Cabinet Grotesk', 'Inter', sans-serif;
  --font-sans: 'Fira Code', 'JetBrains Mono', monospace;

  --brand: ${primary};
  --brand-2: ${secondary};
  --brand-soft: rgba(255,107,44,.08);
  --brand-ring: rgba(255,107,44,.22);

  --ink: #1a1d23;

  --bg: #f4f5f7;
  --surface: #ffffff;
  --surface-2: #f8f9fb;
  --border: #e4e4e6;
  --border-soft: #f1f1f2;

  --fg: #131417;
  --fg-body: #2e2f34;
  --fg-muted: #6b6d73;
  --fg-dim: #9a9ba0;

  --green: #10b981;
  --green-bg: #ecfdf5;
  --green-border: #a7f3d0;
  --green-text: #065f46;
  --amber: #f59e0b;
  --amber-bg: #fffbeb;
  --amber-border: #fde68a;
  --amber-text: #78350f;
  --red: #ef4444;
  --red-bg: #fef2f2;
  --red-border: #fecaca;
  --red-text: #7f1d1d;
  --blue: #3b82f6;
  --blue-bg: #eff6ff;
  --blue-border: #bfdbfe;
  --blue-text: #1e3a8a;
  --purple: #7c3aed;
  --purple-bg: #f5f3ff;
  --purple-border: #ddd6fe;
  --purple-text: #4c1d95;

  --shadow-sm: 0 1px 3px rgba(15,23,42,0.06),0 1px 2px rgba(15,23,42,0.04);
  --shadow-md: 0 4px 6px -1px rgba(15,23,42,0.08),0 2px 4px -2px rgba(15,23,42,0.05);
  --shadow-lg: 0 10px 15px -3px rgba(15,23,42,0.10),0 4px 6px -4px rgba(15,23,42,0.06);
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font-sans);
  background: var(--bg);
  color: var(--fg-body);
  font-size: 14px;
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.report {
  max-width: 860px;
  margin: 32px auto 64px;
  background: var(--surface);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: var(--shadow-lg), 0 24px 64px rgba(0,0,0,0.10);
}

/* Cover */
.cover {
  background: var(--ink);
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
  padding: 64px 72px 56px;
  color: #fff;
  position: relative;
  overflow: hidden;
}
.cover::before {
  content: '';
  position: absolute; top: -60px; right: -80px;
  width: 380px; height: 380px; border-radius: 50%;
  background: var(--brand); opacity: 0.07;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.cover::after {
  content: '';
  position: absolute; bottom: -40px; left: -60px;
  width: 260px; height: 260px; border-radius: 50%;
  background: var(--brand); opacity: 0.05;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.cover .eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--font-display);
  font-size: 0.68rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.22em;
  color: var(--brand); margin-bottom: 24px;
}
.cover .eyebrow::before { content: '◆'; font-size: 0.6em; opacity: 0.9; }
.cover h1 {
  font-family: var(--font-display);
  font-size: 3rem; font-weight: 900; color: #fff;
  margin: 0 0 12px; letter-spacing: -0.035em; line-height: 1.05;
}
.cover .target {
  font-size: 0.85rem; color: rgba(255,255,255,0.4);
  margin-bottom: 40px; font-family: var(--font-sans);
}
.score-ribbon {
  display: inline-flex; align-items: center; gap: 14px;
  padding: 16px 36px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 100px; color: #fff;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.score-ribbon.level-green { background: rgba(16,185,129,0.85); border-color: rgba(16,185,129,0.4); }
.score-ribbon.level-blue  { background: rgba(59,130,246,0.85); border-color: rgba(59,130,246,0.4); }
.score-ribbon.level-amber { background: rgba(245,158,11,0.85); border-color: rgba(245,158,11,0.4); }
.score-ribbon.level-red   { background: rgba(239,68,68,0.85);  border-color: rgba(239,68,68,0.4); }
.score-ribbon strong {
  font-family: var(--font-display);
  font-size: 2.4rem; font-weight: 900; line-height: 1; letter-spacing: -0.04em;
}
.score-ribbon .slash { font-size: 0.9rem; opacity: 0.65; }
.score-ribbon .level-label { font-size: 0.9rem; font-weight: 600; opacity: 0.95; }
.cover .meta { margin-top: 28px; font-size: 0.78rem; color: rgba(255,255,255,0.35); }
.brand-logo {
  max-height: 36px; max-width: 160px; margin: 0 auto 28px; display: block;
  filter: brightness(0) invert(1); opacity: 0.85;
}

/* Body */
.report-body { padding: 52px 72px 48px; }

h2 {
  font-family: var(--font-display);
  font-size: 1.3rem; font-weight: 800; color: var(--fg);
  letter-spacing: -0.025em;
  margin: 3rem 0 1.2rem; padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--border-soft);
  display: flex; align-items: center; gap: 10px;
}
h2::before {
  content: '';
  display: inline-block; width: 3px; height: 1.1em;
  background: var(--brand); border-radius: 2px; flex-shrink: 0;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
h3 {
  font-family: var(--font-display);
  font-size: 0.95rem; font-weight: 700; color: var(--fg);
  margin: 1.6rem 0 0.5rem;
}
p { margin: 0.4rem 0 0.8rem; color: var(--fg-body); line-height: 1.75; }
strong { color: var(--fg); font-weight: 700; }
ul { padding-left: 0; list-style: none; margin: 8px 0 12px; }
li { padding: 5px 0 5px 22px; position: relative; line-height: 1.6; color: var(--fg-body); }
li::before { content: '›'; position: absolute; left: 6px; color: var(--brand); font-weight: 700; font-size: 1.1em; line-height: 1.4; }
code {
  background: var(--surface-2); padding: 2px 7px;
  border-radius: 5px; font-size: 0.82em;
  font-family: var(--font-sans); color: var(--brand);
  border: 1px solid var(--border);
}
hr { border: none; border-top: 1px solid var(--border); margin: 28px 0; }

/* KPI row */
.kpi-row { display: flex; gap: 12px; flex-wrap: wrap; margin: 20px 0 8px; }
.kpi-pill {
  flex: 1; min-width: 120px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 14px; padding: 18px 18px 14px;
  text-align: center; box-shadow: var(--shadow-sm);
}
.kpi-pill .kpi-value {
  font-family: var(--font-display);
  font-size: 2rem; font-weight: 900; line-height: 1; letter-spacing: -0.04em;
}
.kpi-pill .kpi-label {
  font-family: var(--font-display);
  font-size: 0.68rem; text-transform: uppercase;
  letter-spacing: 0.09em; color: var(--fg-muted); margin-top: 6px; font-weight: 700;
}
.kpi-pill.kpi-red   { border-color: var(--red-border);   background: var(--red-bg); }
.kpi-pill.kpi-amber { border-color: var(--amber-border); background: var(--amber-bg); }
.kpi-pill.kpi-blue  { border-color: var(--blue-border);  background: var(--blue-bg); }
.kpi-pill.kpi-green { border-color: var(--green-border); background: var(--green-bg); }
.kpi-pill.kpi-red   .kpi-value { color: var(--red); }
.kpi-pill.kpi-amber .kpi-value { color: var(--amber); }
.kpi-pill.kpi-blue  .kpi-value { color: var(--blue); }
.kpi-pill.kpi-green .kpi-value { color: var(--green); }

/* Executive summary */
.exec-box {
  background: var(--surface-2); border: 1px solid var(--border);
  border-left: 4px solid var(--brand); border-radius: 0 12px 12px 0;
  padding: 20px 24px; margin: 12px 0 20px;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.exec-box p { margin: 0 0 10px; color: var(--fg-body); line-height: 1.75; }
.exec-box p:last-child { margin-bottom: 0; }

/* Phase breakdown */
.phase-list { display: flex; flex-direction: column; gap: 2px; margin: 16px 0 24px; }
.phase-row {
  display: grid; grid-template-columns: 1fr 70px 80px;
  align-items: center; gap: 14px; padding: 11px 0;
  border-bottom: 1px solid var(--border-soft);
}
.phase-row:last-child { border-bottom: none; }
.phase-name { font-family: var(--font-display); font-size: 0.84rem; font-weight: 600; color: var(--fg); }
.phase-bar-wrap { height: 6px; background: var(--border-soft); border-radius: 100px; overflow: hidden; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.phase-bar-fill { height: 100%; border-radius: 100px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.phase-bar-fill.good  { background: var(--green); }
.phase-bar-fill.ok    { background: var(--blue); }
.phase-bar-fill.warn  { background: var(--amber); }
.phase-bar-fill.bad   { background: var(--red); }
.phase-score-label { font-family: var(--font-display); font-size: 0.78rem; color: var(--fg-muted); text-align: right; font-weight: 600; white-space: nowrap; }

/* Finding cards */
.finding-card { border: 1px solid var(--border); border-radius: 12px; margin: 10px 0; overflow: hidden; break-inside: avoid; box-shadow: var(--shadow-sm); }
.finding-header { display: flex; align-items: center; gap: 12px; padding: 13px 18px; border-left: 4px solid; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.finding-header.sev-critical { border-color: var(--red);    background: var(--red-bg); }
.finding-header.sev-high     { border-color: var(--amber);  background: var(--amber-bg); }
.finding-header.sev-medium   { border-color: var(--blue);   background: var(--blue-bg); }
.finding-header.sev-low      { border-color: var(--fg-dim); background: var(--surface-2); }
.finding-title { font-family: var(--font-display); font-weight: 700; font-size: 0.9rem; color: var(--fg); flex: 1; }
.sev-badge {
  display: inline-block; padding: 3px 10px; border-radius: 100px;
  font-family: var(--font-display); font-size: 0.66rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.08em; white-space: nowrap;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.sev-badge.sev-critical { background: var(--red);    color: #fff; }
.sev-badge.sev-high     { background: var(--amber);  color: #fff; }
.sev-badge.sev-medium   { background: var(--blue);   color: #fff; }
.sev-badge.sev-low      { background: var(--fg-dim); color: #fff; }
.pts-badge { font-size: 0.78rem; font-weight: 700; color: var(--red); white-space: nowrap; }
.finding-body { padding: 14px 18px 16px; }
.finding-body .fdesc { font-size: 0.875rem; color: var(--fg-body); margin: 0 0 12px; }
.finding-rec {
  background: var(--green-bg); border: 1px solid var(--green-border);
  border-radius: 8px; padding: 10px 14px;
  font-size: 0.85rem; color: var(--green-text); font-weight: 500;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}

/* Quick wins */
.qw-list { display: flex; flex-direction: column; gap: 8px; margin: 14px 0 24px; }
.qw-item {
  display: flex; align-items: flex-start; gap: 10px;
  background: var(--green-bg); border: 1px solid var(--green-border);
  border-radius: 8px; padding: 11px 14px;
  font-size: 0.875rem; color: var(--green-text);
  break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.qw-check { font-weight: 700; flex-shrink: 0; color: var(--green); }
.qw-text { flex: 1; }
.qw-pts { font-size: 0.78rem; font-weight: 700; color: var(--green); white-space: nowrap; margin-left: auto; }

/* Roadmap sprints */
.sprint-card { border: 1px solid var(--border); border-radius: 14px; margin: 14px 0; overflow: hidden; break-inside: avoid; box-shadow: var(--shadow-sm); }
.sprint-head { display: flex; align-items: center; gap: 14px; padding: 15px 22px; border-bottom: 1px solid; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.sprint-head.s1 { background: var(--green-bg);  border-color: var(--green-border); }
.sprint-head.s2 { background: var(--blue-bg);   border-color: var(--blue-border); }
.sprint-head.s3 { background: var(--purple-bg); border-color: var(--purple-border); }
.sprint-title { font-family: var(--font-display); font-weight: 800; font-size: 0.92rem; }
.sprint-head.s1 .sprint-title { color: var(--green-text); }
.sprint-head.s2 .sprint-title { color: var(--blue-text); }
.sprint-head.s3 .sprint-title { color: var(--purple-text); }
.sprint-obj { font-size: 0.78rem; color: var(--fg-muted); margin-left: auto; font-weight: 600; }
.sprint-body { padding: 10px 22px 16px; }
.sprint-item {
  display: flex; align-items: flex-start; gap: 10px; padding: 9px 0;
  font-size: 0.875rem; color: var(--fg-body);
  border-bottom: 1px solid var(--border-soft);
}
.sprint-item:last-child { border-bottom: none; }
.sprint-check { width: 16px; height: 16px; border: 1.5px solid var(--border); border-radius: 4px; flex-shrink: 0; margin-top: 2px; }
.sprint-item-text { flex: 1; }
.sprint-pts { font-size: 0.78rem; font-weight: 600; color: var(--fg-muted); white-space: nowrap; margin-left: 8px; }

/* Points forts */
.forces-list { display: flex; flex-direction: column; gap: 8px; margin: 14px 0 24px; }
.force-card {
  display: flex; align-items: center; gap: 12px;
  background: var(--green-bg); border: 1px solid var(--green-border);
  border-left: 4px solid var(--green); border-radius: 8px;
  padding: 10px 14px; font-size: 0.875rem;
  break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.force-icon { font-weight: 700; color: var(--green); flex-shrink: 0; }
.force-title { flex: 1; font-weight: 600; color: var(--green-text); font-family: var(--font-display); }
.force-score { font-size: 0.78rem; font-weight: 600; color: var(--green); white-space: nowrap; margin-left: auto; }

/* Table */
table { border-collapse: collapse; width: 100%; margin: 14px 0 24px; font-size: 0.875rem; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
thead { background: var(--surface-2); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
th { font-family: var(--font-display); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.65rem; font-weight: 700; color: var(--fg-muted); padding: 10px 14px; text-align: left; border-bottom: 1px solid var(--border); }
td { padding: 10px 14px; border-top: 1px solid var(--border-soft); color: var(--fg-body); vertical-align: top; }
tbody tr:nth-child(even) td { background: var(--surface-2); -webkit-print-color-adjust: exact; print-color-adjust: exact; }

/* Footer */
footer { margin: 0 72px; padding: 22px 0 40px; border-top: 1px solid var(--border); font-size: 0.75rem; color: var(--fg-muted); text-align: center; font-family: var(--font-display); }

/* Print */
@media print {
  body { background: #fff; }
  .report { box-shadow: none; border-radius: 0; margin: 0; max-width: none; }
  .cover { break-after: page; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .report-body { padding: 36px 52px; }
  footer { margin: 0 52px; padding: 18px 0 28px; }
  h2 { break-after: avoid; }
  h3 { break-after: avoid; }
  .finding-card, .sprint-card, .qw-item { break-inside: avoid; }
}
`
}

// ── Cover ─────────────────────────────────────────────────────────────────────

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

// ── KPI row ───────────────────────────────────────────────────────────────────

function buildKpiRow(input: ReportInput): string {
  const real = actionableFindings(input.findings)
  const critical = real.filter((f) => f.severity === 'critical').length
  const high = real.filter((f) => f.severity === 'high').length
  const quickWins = real.filter(
    (f) => f.effort === 'quick' && f.severity !== 'info',
  ).length
  const gain = computePotentialGain(input.findings)

  return `<div class="kpi-row">
    <div class="kpi-pill kpi-red">
      <div class="kpi-value">${critical}</div>
      <div class="kpi-label">Critiques</div>
    </div>
    <div class="kpi-pill kpi-amber">
      <div class="kpi-value">${high}</div>
      <div class="kpi-label">Importantes</div>
    </div>
    <div class="kpi-pill kpi-blue">
      <div class="kpi-value">${quickWins}</div>
      <div class="kpi-label">Quick wins</div>
    </div>
    <div class="kpi-pill kpi-green">
      <div class="kpi-value">+${gain.max}</div>
      <div class="kpi-label">Pts potentiels</div>
    </div>
  </div>`
}

// ── Executive summary ─────────────────────────────────────────────────────────

function buildExecutiveSummaryHtml(input: ReportInput): string {
  const { audit, phases, findings } = input
  const score = Math.round(audit.scoreTotal ?? 0)
  const level = scoreLevel(score)
  const real = actionableFindings(findings)
  const critical = real.filter((f) => f.severity === 'critical').length
  const high = real.filter((f) => f.severity === 'high').length

  const topWeakness = [...phases]
    .filter((p) => p.phaseKey !== 'synthesis' && p.status !== 'skipped')
    .sort((a, b) => {
      const ra = a.scoreMax > 0 ? (a.score ?? 0) / a.scoreMax : 1
      const rb = b.scoreMax > 0 ? (b.score ?? 0) / b.scoreMax : 1
      return ra - rb
    })[0]

  const topStrength = [...phases]
    .filter((p) => p.phaseKey !== 'synthesis' && p.status !== 'skipped')
    .sort((a, b) => {
      const ra = a.scoreMax > 0 ? (a.score ?? 0) / a.scoreMax : 0
      const rb = b.scoreMax > 0 ? (b.score ?? 0) / b.scoreMax : 0
      return rb - ra
    })[0]

  const paras: string[] = []
  const site = audit.targetUrl ? escapeHtml(audit.targetUrl) : 'votre site'
  paras.push(
    `${site} obtient un score global de <strong>${score}/100</strong> — niveau « ${escapeHtml(level.label)} ». L'analyse identifie <strong>${real.length} constat${real.length > 1 ? 's' : ''}</strong> au total, dont <strong>${critical + high}</strong> avec un impact élevé ou critique.`,
  )
  if (topWeakness) {
    const label = escapeHtml(
      PHASE_LABELS_FR[topWeakness.phaseKey] ?? topWeakness.phaseKey,
    )
    const context = PHASE_CONTEXT_FR[topWeakness.phaseKey] ?? ''
    paras.push(
      `Le principal axe d'amélioration porte sur <strong>${label}</strong>. ${escapeHtml(context)}`,
    )
  }
  if (topStrength) {
    const label = escapeHtml(
      PHASE_LABELS_FR[topStrength.phaseKey] ?? topStrength.phaseKey,
    )
    paras.push(
      `À l'inverse, <strong>${label}</strong> est déjà bien couvert et constitue une base solide.`,
    )
  }

  return `<div class="exec-box">
    ${paras.map((p) => `<p>${capitalizeProperNouns(p)}</p>`).join('\n    ')}
  </div>`
}

// ── Phase breakdown ───────────────────────────────────────────────────────────

function barClass(ratio: number): string {
  if (ratio >= 0.75) return 'good'
  if (ratio >= 0.5) return 'ok'
  if (ratio >= 0.3) return 'warn'
  return 'bad'
}

function buildPhaseBreakdownHtml(phases: ReportPhase[]): string {
  const rows = PHASE_ORDER.filter((key) => key !== 'synthesis').map(
    (key: PhaseKey) => {
      const phase = phases.find((p) => p.phaseKey === key)
      const score = phase?.score ?? 0
      const max = PHASE_SCORE_MAX[key]
      const ratio = max > 0 ? score / max : 0
      const pct = Math.round(Math.min(1, ratio) * 100)
      const cls = barClass(ratio)
      const label = escapeHtml(PHASE_LABELS_FR[key] ?? key)
      return `<div class="phase-row">
        <span class="phase-name">${label}</span>
        <div class="phase-bar-wrap">
          <div class="phase-bar-fill ${cls}" style="width:${pct}%"></div>
        </div>
        <span class="phase-score-label">${Math.round(score)} / ${max}</span>
      </div>`
    },
  )

  return `<div class="phase-list">
    ${rows.join('\n    ')}
  </div>`
}

// ── Points forts (Forces) ─────────────────────────────────────────────────────

function buildForcesHtml(phases: ReportPhase[]): string {
  const FORCE_THRESHOLD = 0.7

  const strengths = [...phases]
    .filter(
      (p) =>
        p.phaseKey !== 'synthesis' &&
        p.status !== 'skipped' &&
        p.scoreMax > 0 &&
        (p.score ?? 0) / p.scoreMax >= FORCE_THRESHOLD,
    )
    .sort((a, b) => {
      const ra = (a.score ?? 0) / a.scoreMax
      const rb = (b.score ?? 0) / b.scoreMax
      return rb - ra
    })
    .slice(0, 5)

  if (strengths.length === 0) return ''

  const cards = strengths
    .map((p) => {
      const label = escapeHtml(PHASE_LABELS_FR[p.phaseKey] ?? p.phaseKey)
      const pct = Math.round(((p.score ?? 0) / p.scoreMax) * 100)
      const score = `${Math.round(p.score ?? 0)} / ${p.scoreMax} pts · ${pct}%`
      return `<div class="force-card">
        <span class="force-icon">✓</span>
        <span class="force-title">${label}</span>
        <span class="force-score">${score}</span>
      </div>`
    })
    .join('\n    ')

  return `<div class="forces-list">
    ${cards}
  </div>`
}

// ── Top 5 issues ──────────────────────────────────────────────────────────────

function buildTop5Html(findings: ReportFinding[]): string {
  const deduped = dedupeByRecommendation(
    actionableFindings(findings).filter(
      (f) => f.severity !== 'info' && f.pointsLost > 0,
    ),
  )
  const top = sortFindings(deduped).slice(0, 5)

  if (top.length === 0) {
    return '<p><em>Aucun problème critique détecté — excellent.</em></p>'
  }

  return top
    .map((f, idx) => {
      const sev = f.severity
      const sevLabel = escapeHtml(SEVERITY_LABELS_FR[sev] ?? sev)
      const effortLabel = f.effort
        ? escapeHtml(EFFORT_LABELS_FR[f.effort] ?? f.effort)
        : null
      return `<div class="finding-card">
        <div class="finding-header sev-${sev}">
          <span class="finding-title">${idx + 1}. ${escapeHtml(capitalizeProperNouns(f.title))}</span>
          <span class="sev-badge sev-${sev}">${sevLabel}</span>
          <span class="pts-badge">-${f.pointsLost} pt${f.pointsLost > 1 ? 's' : ''}</span>
        </div>
        <div class="finding-body">
          <p class="fdesc">${escapeHtml(capitalizeProperNouns(f.description))}${effortLabel ? ` <em>Effort : ${effortLabel}.</em>` : ''}</p>
          <div class="finding-rec">✓ ${escapeHtml(capitalizeProperNouns(f.recommendation))}</div>
        </div>
      </div>`
    })
    .join('\n')
}

// ── Quick wins ────────────────────────────────────────────────────────────────

function buildQuickWinsHtml(findings: ReportFinding[]): string {
  const candidates = actionableFindings(findings).filter(
    (f) => f.effort === 'quick' && f.severity !== 'info',
  )
  const quicks = dedupeByRecommendation(candidates)
    .sort((a, b) => b.pointsLost - a.pointsLost)
    .slice(0, 10)

  if (quicks.length === 0) {
    return '<p><em>Aucune quick win à signaler.</em></p>'
  }

  const items = quicks
    .map(
      (f) => `<div class="qw-item">
      <span class="qw-check">✓</span>
      <span class="qw-text">${escapeHtml(capitalizeProperNouns(f.recommendation.replace(/\.$/, '')))}</span>
      <span class="qw-pts">+${f.pointsLost} pt${f.pointsLost > 1 ? 's' : ''}</span>
    </div>`,
    )
    .join('\n  ')

  return `<div class="qw-list">
  ${items}
</div>`
}

// ── Roadmap ───────────────────────────────────────────────────────────────────

function sprintItems(list: ReportFinding[]): string {
  if (list.length === 0)
    return '<p style="padding:4px 0;font-size:0.85rem;color:var(--muted)"><em>Aucune action à planifier.</em></p>'
  return list
    .map(
      (f) => `<div class="sprint-item">
        <div class="sprint-check"></div>
        <span class="sprint-item-text">${escapeHtml(capitalizeProperNouns(f.recommendation.replace(/\.$/, '')))}</span>
        <span class="sprint-pts">+${f.pointsLost} pt${f.pointsLost > 1 ? 's' : ''}</span>
      </div>`,
    )
    .join('\n      ')
}

function buildRoadmapHtml(findings: ReportFinding[]): string {
  const rankable = dedupeByRecommendation(
    actionableFindings(findings).filter((f) => f.severity !== 'info'),
  )
  const sorted = sortFindings(rankable)

  const quicks = sorted.filter((f) => f.effort === 'quick').slice(0, 5)
  const mediums = sorted.filter((f) => f.effort === 'medium').slice(0, 5)
  const heavys = sorted.filter((f) => f.effort === 'heavy').slice(0, 4)

  const sum = (list: ReportFinding[]) =>
    list.reduce((acc, f) => acc + f.pointsLost, 0)

  return `<div class="sprint-card">
    <div class="sprint-head s1">
      <span class="sprint-title">🏃 Sprint 1 — Victoires rapides (Semaines 1-2)</span>
      <span class="sprint-obj">Objectif : +${sum(quicks)} pt${sum(quicks) > 1 ? 's' : ''}</span>
    </div>
    <div class="sprint-body">
      ${sprintItems(quicks)}
    </div>
  </div>
  <div class="sprint-card">
    <div class="sprint-head s2">
      <span class="sprint-title">🔧 Sprint 2 — Structurant (Semaines 3-6)</span>
      <span class="sprint-obj">Objectif : +${sum(mediums)} pt${sum(mediums) > 1 ? 's' : ''}</span>
    </div>
    <div class="sprint-body">
      ${sprintItems(mediums)}
    </div>
  </div>
  <div class="sprint-card">
    <div class="sprint-head s3">
      <span class="sprint-title">🎯 Sprint 3 — Stratégique (Semaines 7-12)</span>
      <span class="sprint-obj">Objectif : +${sum(heavys)} pt${sum(heavys) > 1 ? 's' : ''}</span>
    </div>
    <div class="sprint-body">
      ${sprintItems(heavys)}
    </div>
  </div>`
}

// ── Hotspot URLs ──────────────────────────────────────────────────────────────

function buildHotspotHtml(findings: ReportFinding[]): string {
  const perUrl = new Map<
    string,
    { count: number; phases: Set<string>; totalPoints: number }
  >()
  for (const f of findings) {
    if (!f.locationUrl || f.phaseKey === 'synthesis') continue
    const entry = perUrl.get(f.locationUrl) ?? {
      count: 0,
      phases: new Set<string>(),
      totalPoints: 0,
    }
    entry.count += 1
    entry.phases.add(f.phaseKey)
    entry.totalPoints += f.pointsLost
    perUrl.set(f.locationUrl, entry)
  }
  const hotspots = Array.from(perUrl.entries())
    .filter(([, v]) => v.count >= 3 && v.phases.size >= 2)
    .sort((a, b) => b[1].totalPoints - a[1].totalPoints)
    .slice(0, 5)

  if (hotspots.length < 2) return ''

  const rows = hotspots
    .map(
      ([url, v]) =>
        `<tr><td><code>${escapeHtml(url)}</code></td><td>${v.count}</td><td>${v.phases.size}</td><td>${v.totalPoints.toFixed(1)}</td></tr>`,
    )
    .join('\n')

  return `<h2>Pages à fort enjeu</h2>
  <p>Ces URLs concentrent plusieurs constats sur plusieurs phases — les optimiser donne un gain transverse immédiat.</p>
  <table>
    <thead><tr><th>URL</th><th>Constats</th><th>Phases</th><th>Pts perdus</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

// ── Markdown (annexes seulement) ──────────────────────────────────────────────

function buildMethodologyHtml(): string {
  const phases = PHASE_ORDER.filter((k) => k !== 'synthesis')
  const items = phases
    .map((key, i) => {
      const label = PHASE_LABELS_FR[key] ?? key
      return `<li><strong>${i + 1}. ${escapeHtml(label)}</strong></li>`
    })
    .join('\n    ')

  return `<ul>
    ${items}
  </ul>`
}

// ── Main generator ────────────────────────────────────────────────────────────

export function generateReport(input: ReportInput): GeneratedReport {
  const { audit, phases, findings } = input
  const score = Math.round(audit.scoreTotal ?? 0)
  const level = scoreLevel(score)
  const gain = computePotentialGain(findings)

  // Markdown kept for storage / compat (not rendered in HTML path)
  const real = actionableFindings(findings)
  const phaseLines = phases
    .filter((p) => p.phaseKey !== 'synthesis')
    .map((p) => `- **${PHASE_LABELS_FR[p.phaseKey] ?? p.phaseKey}** : ${p.summary ?? 'Pas de résumé.'}`)
    .join('\n')

  const markdown = capitalizeProperNouns(`# Audit SEO & GEO — ${audit.clientName ?? audit.targetUrl ?? 'Résultats'}

Score : ${score}/100 — ${level.label}
Constats : ${real.length} dont ${real.filter(f => f.severity === 'critical').length} critiques.
Gain potentiel : +${gain.min} à +${gain.max} pts.

## Phases
${phaseLines}
`)

  // HTML built directly — no markdown→HTML pipeline for main sections
  const cover = buildCoverHtml(audit, input.branding)
  const styles = buildStyles(input.branding)
  const kpiRow = buildKpiRow(input)
  const execSummary = buildExecutiveSummaryHtml(input)
  const phaseBreakdown = buildPhaseBreakdownHtml(phases)
  const forces = buildForcesHtml(phases)
  const top5 = buildTop5Html(findings)
  const quickWins = buildQuickWinsHtml(findings)
  const roadmap = buildRoadmapHtml(findings)
  const hotspot = buildHotspotHtml(findings)
  const methodology = buildMethodologyHtml()
  const companyName = input.branding?.companyName?.trim() || 'Wyzlee'
  const consultant = audit.consultantName
    ? `<strong>${escapeHtml(audit.consultantName)}</strong><br>`
    : ''

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Audit SEO &amp; GEO — ${escapeHtml(audit.clientName ?? audit.targetUrl ?? '')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<style>${styles}</style>
</head>
<body>
<div class="report">
  ${cover}
  <div class="report-body">

    <h2>Synthèse</h2>
    ${kpiRow}
    ${execSummary}

    <h2>Scoring par phase</h2>
    ${phaseBreakdown}

    ${hotspot}

    ${forces ? `<h2>Points forts</h2>\n    ${forces}` : ''}

    <h2>Points à corriger en priorité</h2>
    ${top5}

    <h2>Victoires rapides <small style="font-size:0.75em;font-weight:500;color:var(--muted)">(chacune réalisable en &lt; 1 h)</small></h2>
    ${quickWins}

    <h2>Feuille de route 90 jours</h2>
    ${roadmap}

    <h2>Méthodologie</h2>
    <p>Cet audit couvre 11 phases d'analyse alignées avec les standards 2026 :</p>
    ${methodology}

    <h2>Contact</h2>
    <p>${consultant}Audit généré par ${escapeHtml(companyName)} · <a href="https://seo-geo-orcin.vercel.app" style="color:var(--brand)">seo-geo-orcin.vercel.app</a></p>
    <p style="margin-top:0.5rem">Pour toute question sur ce rapport : <a href="mailto:support@wyzlee.cloud" style="color:var(--brand)">support@wyzlee.cloud</a></p>

  </div>
  <footer>Audit généré par ${escapeHtml(companyName)} · ${escapeHtml(formatDateFr(audit.finishedAt))}</footer>
</div>
</body>
</html>`

  return { markdown, html, templateVersion: TEMPLATE_VERSION }
}
