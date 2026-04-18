---
name: data-model
description: Schéma Drizzle/Neon du projet SEO-GEO — 7 tables, relations, conventions multi-tenant, index critiques, patterns de requêtes.
type: skill
---

# Skill : data-model

## 7 tables Neon Postgres

### `organizations`
```ts
id: uuid PK
name: text NOT NULL
slug: text UNIQUE NOT NULL
branding: jsonb               // { logo, primaryColor, secondaryColor }
plan: enum('free','pro','agency') DEFAULT 'free'
stripeCustomerId: text        // à ajouter en S2.3
createdAt, updatedAt
```

### `users`
```ts
id: text PK                   // Stack Auth user ID (format: "user_XXXX")
email: text UNIQUE NOT NULL
displayName: text
avatarUrl: text
createdAt, updatedAt
```

### `memberships`
```ts
userId → users.id CASCADE
organizationId → organizations.id CASCADE
role: enum('member','admin','owner')
UNIQUE(userId, organizationId)
```

### `audits` (table principale)
```ts
id: uuid PK
organizationId → organizations.id (INDEX)
createdBy → users.id
inputType: enum('url','zip','github')
targetUrl, uploadId, uploadPath, githubRepo
status: enum('queued','running','completed','failed')
scoreTotal: int              // 0-100
scoreBreakdown: jsonb        // { technical: 12, geo: 15, ... }
clientName, consultantName   // white-label agence
mode: enum('full','standard','flash')
previousAuditId → audits.id  // comparaison
queuedAt, startedAt, finishedAt, errorMessage
```

**Index critiques (3 manquants en S1.9)** :
```sql
-- Worker poll (BLOQUANT)
CREATE INDEX audits_status_queued_at_idx ON audits (status, queued_at ASC)
  WHERE status = 'queued';

-- Dashboard liste
CREATE INDEX audits_org_created_idx ON audits (organization_id, created_at DESC);
```

### `auditPhases`
```ts
auditId → audits.id CASCADE
phaseKey: text               // 'technical' | 'geo' | 'eeat' | ...
phaseOrder: int              // 1-11
score, scoreMax
status: enum('pending','running','completed','skipped','failed')
summary: text
startedAt, finishedAt
UNIQUE(auditId, phaseKey)
```

### `findings`
```ts
auditId → audits.id CASCADE
phaseKey: text
severity: enum('critical','high','medium','low','info')
category, title, description, recommendation
locationUrl, locationFile, locationLine
metricValue, metricTarget
pointsLost: int             // ≥ 0
effort: enum('quick','medium','heavy')
```

**Index critique (manquant)** :
```sql
-- Rapport par section (BLOQUANT)
CREATE INDEX findings_audit_phase_idx ON findings (audit_id, phase_key);
```

### `reports`
```ts
auditId → audits.id CASCADE
format: enum('html','pdf')
language: text DEFAULT 'fr'
templateVersion: text
contentMd, contentHtml
pdfStorageKey: text         // futur Vercel Blob
shareSlug: text UNIQUE      // URL publique
shareExpiresAt: timestamp   // +30j à la génération
generatedAt
```

### `webhooks`
```ts
organizationId → organizations.id
url, secret                  // HMAC SHA-256
events: text[]              // ['audit.completed']
active: boolean
lastSuccessAt, lastErrorAt, lastErrorMessage
```

## Patterns de requêtes importants

```ts
// TOUJOURS filtrer par organizationId (multi-tenant)
const audits = await db.select()
  .from(schema.audits)
  .where(and(
    eq(schema.audits.organizationId, orgId),
    eq(schema.audits.status, 'completed')
  ))
  .orderBy(desc(schema.audits.createdAt))
  .limit(20)

// Findings par phase pour le rapport
const findings = await db.select()
  .from(schema.findings)
  .where(and(
    eq(schema.findings.auditId, auditId),
    eq(schema.findings.phaseKey, phase)
  ))
  .orderBy(desc(schema.findings.pointsLost))
```

## Conventions schema Drizzle

- Timestamps : `createdAt: timestamp('created_at').defaultNow().notNull()`
- UUID : `id: uuid('id').primaryKey().defaultRandom()`
- Enum : `pgEnum()` Drizzle (pas enum SQL natif pour portabilité)
- Jamais de colonne sans `notNull()` sauf nullable explicitement justifié
- FK toujours avec `references(() => table.col, { onDelete: 'cascade' })`

## Workflow migration

```bash
npm run db:generate    # drizzle-kit generate
# REVIEW le SQL avant apply
npm run db:migrate     # apply sur Neon dev branch
# → merge Neon branch sur prod après validation
```

Ne jamais `db:push` direct en prod. Toujours via `/db-migrate` workflow.
