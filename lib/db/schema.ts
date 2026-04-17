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
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  branding: jsonb('branding'),
  plan: text('plan').notNull().default('free'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
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
