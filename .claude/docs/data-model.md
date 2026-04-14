# Data Model

> Schémas Drizzle canoniques. Fichier source : `lib/db/schema.ts`. Migrations via `drizzle-kit`.
> Pattern d'accès : lazy Proxy dans `lib/db/index.ts` (référence : wyz-scrib/lib/db/index.ts).

## Tables

### `organizations`

Une org = un tenant. Tous les audits appartiennent à une org.

```ts
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),       // URL-safe, ex: "acme-agency"
  branding: jsonb('branding'),                 // { logo_url, primary_color } pour white-label
  plan: text('plan').notNull().default('free'),// free | pro | agency (V2)
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
})
```

### `users`

Sync depuis Stack Auth via webhook. Ne pas stocker de password — Stack Auth gère l'auth.

```ts
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),                 // = Stack Auth user id
  email: text('email').unique().notNull(),
  display_name: text('display_name'),
  avatar_url: text('avatar_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
})
```

### `memberships`

Relation N:N user ↔ organization avec rôle.

```ts
export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  organization_id: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'),  // owner | admin | member
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  uniqUserOrg: uniqueIndex('memberships_user_org_uniq').on(t.user_id, t.organization_id),
}))
```

### `audits`

Un audit = une analyse lancée sur une URL ou un upload de code.

```ts
export const audits = pgTable('audits', {
  id: uuid('id').primaryKey().defaultRandom(),
  organization_id: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  created_by: uuid('created_by').notNull().references(() => users.id),

  // Input
  input_type: text('input_type').notNull(),    // 'url' | 'zip' | 'github'
  target_url: text('target_url'),              // si input_type='url'
  upload_id: uuid('upload_id'),                // si input_type='zip', pointe vers storage
  github_repo: text('github_repo'),            // si input_type='github', "owner/repo@ref"

  // Status + scoring
  status: text('status').notNull().default('queued'), // queued | running | completed | failed
  score_total: integer('score_total'),         // 0-100
  score_breakdown: jsonb('score_breakdown'),   // { technical: 10, structured_data: 13, geo: 15, ... }

  // Client context (pour rapport white-label)
  client_name: text('client_name'),            // ex: "Acme SA"
  consultant_name: text('consultant_name'),    // ex: "Olivier Duvernay"

  // Flags
  mode: text('mode').notNull().default('full'),// full | quick (tripwire top-10)

  // Lifecycle
  queued_at: timestamp('queued_at').defaultNow().notNull(),
  started_at: timestamp('started_at'),
  finished_at: timestamp('finished_at'),
  error_message: text('error_message'),

  created_at: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  idxOrgStatus: index('audits_org_status_idx').on(t.organization_id, t.status),
  idxQueued: index('audits_queued_idx').on(t.status, t.queued_at), // pour worker claim
}))
```

### `audit_phases`

Une ligne par phase par audit. 11 phases au total (voir `audit-engine.md`).

```ts
export const auditPhases = pgTable('audit_phases', {
  id: uuid('id').primaryKey().defaultRandom(),
  audit_id: uuid('audit_id').notNull().references(() => audits.id, { onDelete: 'cascade' }),

  phase_key: text('phase_key').notNull(),      // 'technical' | 'structured_data' | 'geo' | ...
  phase_order: integer('phase_order').notNull(),// 1..11

  score: integer('score'),                     // points obtenus
  score_max: integer('score_max').notNull(),   // points max de la phase
  status: text('status').notNull().default('pending'), // pending | running | completed | skipped | failed

  summary: text('summary'),                    // 1-2 phrases résumant la phase
  started_at: timestamp('started_at'),
  finished_at: timestamp('finished_at'),
}, (t) => ({
  uniqAuditPhase: uniqueIndex('audit_phases_uniq').on(t.audit_id, t.phase_key),
  idxAudit: index('audit_phases_audit_idx').on(t.audit_id),
}))
```

### `findings`

Chaque issue identifiée par une phase. Un audit peut avoir 10-200 findings.

```ts
export const findings = pgTable('findings', {
  id: uuid('id').primaryKey().defaultRandom(),
  audit_id: uuid('audit_id').notNull().references(() => audits.id, { onDelete: 'cascade' }),
  phase_key: text('phase_key').notNull(),      // 'geo' | 'technical' | ...

  severity: text('severity').notNull(),        // 'critical' | 'high' | 'medium' | 'low' | 'info'
  category: text('category'),                  // ex: 'ai-bots', 'llms-txt', 'inp', 'entity-sameas'
  title: text('title').notNull(),              // court, FR — ex: "robots.txt bloque GPTBot par erreur"
  description: text('description').notNull(), // FR, ~3-5 phrases
  recommendation: text('recommendation').notNull(), // FR, action concrète

  // Localisation (si applicable)
  location_url: text('location_url'),          // URL où le problème existe
  location_file: text('location_file'),        // fichier si input=code
  location_line: integer('location_line'),     // ligne si input=code

  // Metrics éventuelles
  metric_value: text('metric_value'),          // ex: "243ms", "87%", "3.2"
  metric_target: text('metric_target'),        // ex: "<200ms", ">90%"

  // Points impact sur scoring
  points_lost: integer('points_lost').notNull().default(0),

  // Effort estimé (pour quick-wins vs roadmap)
  effort: text('effort'),                      // 'quick' (<1h) | 'medium' (<1 jour) | 'heavy' (>1 jour)

  created_at: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  idxAudit: index('findings_audit_idx').on(t.audit_id),
  idxSeverity: index('findings_severity_idx').on(t.audit_id, t.severity),
}))
```

### `reports`

Un audit peut avoir 0 ou 1+ rapports (versions rafraîchies, langues différentes).

```ts
export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  audit_id: uuid('audit_id').notNull().references(() => audits.id, { onDelete: 'cascade' }),

  format: text('format').notNull(),            // 'web' | 'pdf'
  language: text('language').notNull().default('fr'), // 'fr' | 'en'
  template_version: text('template_version').notNull(), // ex: 'v1.0'

  content_md: text('content_md'),              // Markdown source (web render from this)
  content_html: text('content_html'),          // HTML pré-rendu pour partage public
  pdf_storage_key: text('pdf_storage_key'),    // clé S3/storage si format=pdf

  share_slug: text('share_slug').unique(),     // token pour /r/:slug
  share_expires_at: timestamp('share_expires_at'),

  generated_at: timestamp('generated_at').defaultNow().notNull(),
}, (t) => ({
  idxAudit: index('reports_audit_idx').on(t.audit_id),
}))
```

### `sources` (optionnel V1.5)

Index des sources citées dans les findings/rapports, synchronisé avec `.claude/docs/sources.md` mais dans la DB pour faciliter l'affichage.

```ts
export const sourcesTable = pgTable('sources', {
  id: text('id').primaryKey(),                 // ex: 'source-1'
  claim: text('claim').notNull(),
  url: text('url').notNull(),
  consulted_at: date('consulted_at').notNull(),
})
```

## Patterns d'accès

### Lazy Proxy (wyz-scrib pattern)

```ts
// lib/db/index.ts
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle> | null = null

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    if (!_db) {
      const url = process.env.DATABASE_URL
      if (!url) throw new Error('DATABASE_URL not set')
      _db = drizzle(neon(url), { schema })
    }
    return Reflect.get(_db, prop)
  },
})
```

### Scope multi-tenant (helper)

```ts
// lib/db/scope.ts
import { db } from './index'
import { audits } from './schema'
import { eq, and } from 'drizzle-orm'

export async function getAuditsForOrg(orgId: string, opts?: { status?: string }) {
  return db.select().from(audits).where(
    and(
      eq(audits.organization_id, orgId),
      opts?.status ? eq(audits.status, opts.status) : undefined,
    )
  )
}
```

**Règle** : aucune query de data métier ne doit omettre `organization_id` dans son `WHERE`. Une PR qui omet cette garde-fou est bloquante.

### Claim worker (queue)

```ts
// worker/claim.ts
export async function claimNextAudit() {
  const rows = await db.execute(sql`
    UPDATE audits
    SET status = 'running', started_at = now()
    WHERE id = (
      SELECT id FROM audits
      WHERE status = 'queued'
      ORDER BY queued_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING *
  `)
  return rows[0] ?? null
}
```

## Migrations

- `drizzle.config.ts` pointe vers Neon prod
- `npm run db:generate` → crée `drizzle/<timestamp>_*.sql`
- `npm run db:migrate` → applique sur DB (dev puis prod via CI ou `/db-migrate`)
- **Jamais de `drop column` / `drop table` sans window de maintenance explicite + backup**

## Relations (ERD résumé)

```
organizations 1 ──── N memberships N ──── 1 users
      │
      │ 1
      ▼
      N audits 1 ──── N audit_phases
              │
              │ 1
              ▼
              N findings
              │
              │ 1
              ▼
              N reports
```

## Notes

- Pas de soft-delete V1. Hard delete via cascade. Restauration via backup Neon branching si besoin.
- Pas de `deleted_at`. Si un user veut "supprimer" un audit, on delete vraiment.
- Pas de sharding. DB unique par app (convention Wyzlee), Neon scale vertical suffit V1-V2.
