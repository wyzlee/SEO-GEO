import {
  type AnyPgColumn,
  pgTable,
  uuid,
  text,
  integer,
  real,
  timestamp,
  jsonb,
  date,
  boolean,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  branding: jsonb('branding'),
  plan: text('plan').notNull().default('discovery'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  // Stripe billing
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripePriceId: text('stripe_price_id'),
  subscriptionStatus: text('subscription_status'), // active | trialing | canceled | past_due | null
  auditUsage: integer('audit_usage').notNull().default(0),
  customDomain: text('custom_domain').unique(),
  customEmailFromName: text('custom_email_from_name'),
})

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').unique().notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    uniqUserOrg: uniqueIndex('memberships_user_org_uniq').on(
      t.userId,
      t.organizationId,
    ),
  }),
)

export const audits = pgTable(
  'audits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),

    inputType: text('input_type').notNull(),
    targetUrl: text('target_url'),
    uploadId: uuid('upload_id'),
    uploadPath: text('upload_path'),
    githubRepo: text('github_repo'),

    status: text('status').notNull().default('queued'),
    scoreTotal: real('score_total'),
    scoreBreakdown: jsonb('score_breakdown'),

    clientName: text('client_name'),
    consultantName: text('consultant_name'),

    mode: text('mode').notNull().default('full'),

    // Self-référence pour comparaison N vs N-1 (ROI tracking).
    // Nullable : premier audit n'a pas de prédécesseur.
    // onDelete: 'set null' : si l'audit précédent est supprimé, on perd
    // juste le lien — pas de cascade destructive.
    previousAuditId: uuid('previous_audit_id').references(
      (): AnyPgColumn => audits.id,
      { onDelete: 'set null' },
    ),

    queuedAt: timestamp('queued_at').defaultNow().notNull(),
    startedAt: timestamp('started_at'),
    finishedAt: timestamp('finished_at'),
    errorMessage: text('error_message'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    idxOrgStatus: index('audits_org_status_idx').on(
      t.organizationId,
      t.status,
    ),
    idxQueued: index('audits_queued_idx').on(t.status, t.queuedAt),
    idxPrevious: index('audits_previous_idx').on(t.previousAuditId),
    idxOrgCreated: index('audits_org_created_idx').on(
      t.organizationId,
      t.createdAt,
    ),
  }),
)

export const auditPhases = pgTable(
  'audit_phases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    auditId: uuid('audit_id')
      .notNull()
      .references(() => audits.id, { onDelete: 'cascade' }),

    phaseKey: text('phase_key').notNull(),
    phaseOrder: integer('phase_order').notNull(),

    score: real('score'),
    scoreMax: real('score_max').notNull(),
    status: text('status').notNull().default('pending'),

    summary: text('summary'),
    startedAt: timestamp('started_at'),
    finishedAt: timestamp('finished_at'),
  },
  (t) => ({
    uniqAuditPhase: uniqueIndex('audit_phases_uniq').on(
      t.auditId,
      t.phaseKey,
    ),
    idxAudit: index('audit_phases_audit_idx').on(t.auditId),
  }),
)

export const findings = pgTable(
  'findings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    auditId: uuid('audit_id')
      .notNull()
      .references(() => audits.id, { onDelete: 'cascade' }),
    phaseKey: text('phase_key').notNull(),

    severity: text('severity').notNull(),
    category: text('category'),
    title: text('title').notNull(),
    description: text('description').notNull(),
    recommendation: text('recommendation').notNull(),

    locationUrl: text('location_url'),
    locationFile: text('location_file'),
    locationLine: integer('location_line'),

    metricValue: text('metric_value'),
    metricTarget: text('metric_target'),

    pointsLost: integer('points_lost').notNull().default(0),

    effort: text('effort'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    idxAudit: index('findings_audit_idx').on(t.auditId),
    idxSeverity: index('findings_severity_idx').on(t.auditId, t.severity),
    idxPhase: index('findings_phase_idx').on(t.auditId, t.phaseKey),
  }),
)

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    auditId: uuid('audit_id')
      .notNull()
      .references(() => audits.id, { onDelete: 'cascade' }),

    format: text('format').notNull(),
    language: text('language').notNull().default('fr'),
    templateVersion: text('template_version').notNull(),

    contentMd: text('content_md'),
    contentHtml: text('content_html'),
    pdfStorageKey: text('pdf_storage_key'),

    shareSlug: text('share_slug').unique(),
    shareExpiresAt: timestamp('share_expires_at'),

    generatedAt: timestamp('generated_at').defaultNow().notNull(),
  },
  (t) => ({
    idxAudit: index('reports_audit_idx').on(t.auditId),
  }),
)

export const webhooks = pgTable(
  'webhooks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    // Secret HMAC-SHA256 (base64url). Régénéré côté API à la création.
    secret: text('secret').notNull(),
    // Events listés en texte séparés virgule (ex: "audit.completed,audit.failed").
    // V1 n'expose que `audit.completed` ; on garde un champ ouvert pour V2.
    events: text('events').notNull().default('audit.completed'),
    active: integer('active').notNull().default(1),
    lastSuccessAt: timestamp('last_success_at'),
    lastErrorAt: timestamp('last_error_at'),
    lastErrorMessage: text('last_error_message'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    idxOrg: index('webhooks_org_idx').on(t.organizationId),
  }),
)

export const sourcesTable = pgTable('sources', {
  id: text('id').primaryKey(),
  claim: text('claim').notNull(),
  url: text('url').notNull(),
  consultedAt: date('consulted_at').notNull(),
})

export const scheduledAudits = pgTable(
  'scheduled_audits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    targetUrl: text('target_url').notNull(),
    mode: text('mode').notNull().default('standard'),
    frequency: text('frequency').notNull(),
    nextRunAt: timestamp('next_run_at').notNull(),
    lastRunAt: timestamp('last_run_at'),
    isActive: boolean('is_active').notNull().default(true),
    alertThreshold: integer('alert_threshold').notNull().default(5), // Points de chute pour déclencher une alerte
    lastAlertSentAt: timestamp('last_alert_sent_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index('scheduled_audits_org_idx').on(t.organizationId),
    nextRunIdx: index('scheduled_audits_next_run_idx').on(t.nextRunAt, t.isActive),
  }),
)

export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => users.id),
    email: text('email').notNull(),
    role: text('role').notNull().default('member'),
    token: text('token').unique().notNull(),
    acceptedAt: timestamp('accepted_at'),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index('invitations_org_idx').on(t.organizationId),
    tokenIdx: index('invitations_token_idx').on(t.token),
    emailIdx: index('invitations_email_idx').on(t.email),
  }),
)

// ---------------------------------------------------------------------------
// Benchmarks — comparaison multi-URL au sein d'une organisation
// ---------------------------------------------------------------------------

export const benchmarks = pgTable('benchmarks', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  name: text('name').notNull(),
  mode: text('mode', { enum: ['flash', 'full'] }).notNull().default('flash'),
  status: text('status', { enum: ['queued', 'running', 'completed', 'failed'] }).notNull().default('queued'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  finishedAt: timestamp('finished_at'),
}, (t) => [
  index('benchmarks_org_idx').on(t.organizationId),
  index('benchmarks_status_idx').on(t.status),
])

export const benchmarkUrls = pgTable('benchmark_urls', {
  id: uuid('id').primaryKey().defaultRandom(),
  benchmarkId: uuid('benchmark_id').notNull().references(() => benchmarks.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  label: text('label').notNull(), // "Mon site" / "Concurrent A"
  isReference: boolean('is_reference').notNull().default(false), // true = site client
  auditId: uuid('audit_id').references(() => audits.id),
}, (t) => [
  index('benchmark_urls_benchmark_idx').on(t.benchmarkId),
])

// ---------------------------------------------------------------------------
// Citation checks — suivi des mentions dans les LLMs (Perplexity, OpenAI)
// ---------------------------------------------------------------------------

export const citationChecks = pgTable('citation_checks', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  domain: text('domain').notNull(),
  query: text('query').notNull(),
  tool: text('tool', { enum: ['perplexity', 'openai'] }).notNull(),
  isCited: boolean('is_cited').notNull().default(false),
  competitorDomainsCited: text('competitor_domains_cited').array().notNull().default([]),
  rawResponse: text('raw_response'),
  checkedAt: timestamp('checked_at').notNull().defaultNow(),
}, (t) => [
  index('citation_checks_org_idx').on(t.organizationId),
  index('citation_checks_domain_idx').on(t.domain),
])

// ---------------------------------------------------------------------------
// Content briefs — génération de briefs éditoriaux depuis un audit
// ---------------------------------------------------------------------------

export const contentBriefs = pgTable('content_briefs', {
  id: uuid('id').primaryKey().defaultRandom(),
  auditId: uuid('audit_id').notNull().references(() => audits.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  targetKeyword: text('target_keyword').notNull(),
  searchIntent: text('search_intent', { enum: ['informational', 'commercial', 'navigational'] }).notNull(),
  contentType: text('content_type', { enum: ['pillar', 'cluster', 'update'] }).notNull(),
  wordCountTarget: integer('word_count_target').notNull(),
  outline: jsonb('outline').notNull(), // { h2: string[], h3_per_h2: string[][] }
  eeatAngle: text('eeat_angle'),
  semanticKeywords: text('semantic_keywords').array().notNull().default([]),
  briefMd: text('brief_md').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('content_briefs_audit_idx').on(t.auditId),
  index('content_briefs_org_idx').on(t.organizationId),
])

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type Invitation = typeof invitations.$inferSelect
export type NewInvitation = typeof invitations.$inferInsert

export type Organization = typeof organizations.$inferSelect
export type NewOrganization = typeof organizations.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Membership = typeof memberships.$inferSelect
export type Audit = typeof audits.$inferSelect
export type NewAudit = typeof audits.$inferInsert
export type AuditPhase = typeof auditPhases.$inferSelect
export type Finding = typeof findings.$inferSelect
export type NewFinding = typeof findings.$inferInsert
export type Report = typeof reports.$inferSelect
export type Webhook = typeof webhooks.$inferSelect
export type NewWebhook = typeof webhooks.$inferInsert
export type ScheduledAudit = typeof scheduledAudits.$inferSelect
export type NewScheduledAudit = typeof scheduledAudits.$inferInsert
export type Benchmark = typeof benchmarks.$inferSelect
export type NewBenchmark = typeof benchmarks.$inferInsert
export type BenchmarkUrl = typeof benchmarkUrls.$inferSelect
export type NewBenchmarkUrl = typeof benchmarkUrls.$inferInsert
export type CitationCheck = typeof citationChecks.$inferSelect
export type NewCitationCheck = typeof citationChecks.$inferInsert
export type ContentBrief = typeof contentBriefs.$inferSelect
export type NewContentBrief = typeof contentBriefs.$inferInsert
