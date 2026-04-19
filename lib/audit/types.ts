/**
 * Shared types for the audit engine.
 * Each phase module consumes `AuditInput` + `PhaseContext`, produces `PhaseResult`.
 */

export type PhaseKey =
  | 'technical'
  | 'structured_data'
  | 'geo'
  | 'entity'
  | 'eeat'
  | 'freshness'
  | 'international'
  | 'performance'
  | 'topical'
  | 'common_mistakes'
  | 'synthesis'

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export type Effort = 'quick' | 'medium' | 'heavy'

export type StackFramework =
  | 'next-app'
  | 'next-pages'
  | 'nuxt'
  | 'remix'
  | 'astro'
  | 'react-spa'
  | 'static'
  | 'other'

export interface StackInfo {
  framework: StackFramework
  hasSSR: boolean
  routerType?: 'history' | 'hash' | null
}

export type AuditInput =
  | { type: 'url'; targetUrl: string }
  | { type: 'zip'; extractedPath: string; stack: StackInfo }
  | { type: 'github'; clonedPath: string; stack: StackInfo; repoRef: string }

export interface SubPageSnapshot {
  url: string
  status: number
  html: string
  lastModified: string | null
  contentHash: string
  // Champs enrichis par crawlMultiPage (BFS) — absents sur pages issues du sitemap
  title?: string
  h1?: string
  wordCount?: number
  internalLinks?: string[]
}

export interface CrawlSnapshot {
  html: string
  finalUrl: string
  status: number
  robotsTxt: string | null
  sitemapXml: string | null
  llmsTxt: string | null
  llmsFullTxt?: string | null
  lastModified?: string | null
  contentHash?: string
  subPages?: SubPageSnapshot[]
}

export interface PhaseContext {
  auditId: string
  organizationId: string
  crawl?: CrawlSnapshot
}

export interface Finding {
  phaseKey: PhaseKey
  severity: Severity
  category: string
  title: string
  description: string
  recommendation: string
  locationUrl?: string
  locationFile?: string
  locationLine?: number
  metricValue?: string
  metricTarget?: string
  pointsLost: number
  effort?: Effort
}

export interface PhaseResult {
  phaseKey: PhaseKey
  score: number
  scoreMax: number
  status: 'completed' | 'skipped' | 'failed'
  summary: string
  findings: Finding[]
}

export interface AuditResult {
  totalScore: number
  breakdown: Partial<Record<PhaseKey, number>>
  findings: Finding[]
}
