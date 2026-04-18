---
name: coding-conventions
description: Conventions de code du projet SEO-GEO — style TypeScript, patterns Drizzle, validation Zod v4, nommage, structure des fichiers, règles de commit.
type: skill
---

# Skill : coding-conventions

## TypeScript strict

```ts
// tsconfig.json : strict: true
// - noImplicitAny: true
// - strictNullChecks: true
// - noUncheckedIndexedAccess: true

// Pattern : types explicites sur les signatures publiques
export async function getAudit(auditId: string, orgId: string): Promise<Audit | null> {
  // ...
}

// Anti-pattern : any implicite
function processData(data: any) { ... }  // INTERDIT
```

## Validation Zod v4 (breaking changes vs v3)

```ts
import { z } from 'zod'

// v4 : .issues (pas .errors)
const result = schema.safeParse(input)
if (!result.success) {
  const issues = result.error.issues  // ← .issues, PAS .errors
}

// Pattern API route
const body = await req.json()
const parsed = createAuditSchema.safeParse(body)
if (!parsed.success) {
  return Response.json({ error: parsed.error.issues }, { status: 400 })
}
```

## Pattern API route complet

```ts
// app/api/audits/route.ts
import { authenticateRequest } from '@/lib/auth/authenticate'
import { createAuditSchema } from '@/lib/types/audit'
import { db } from '@/lib/db'
import { audits } from '@/lib/db/schema'

export async function POST(req: Request) {
  const { user, org } = await authenticateRequest(req)

  const body = await req.json()
  const parsed = createAuditSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 })
  }

  const audit = await db.insert(audits).values({
    organizationId: org.id,
    createdBy: user.id,
    ...parsed.data,
  }).returning()

  return Response.json(audit[0], { status: 201 })
}
```

## Nommage

| Type | Convention | Exemple |
|------|-----------|---------|
| Fichiers pages | kebab-case | `audit-detail.tsx` |
| Composants | PascalCase | `PhaseCard.tsx` |
| Hooks | camelCase + `use` prefix | `useAuditDetail.ts` |
| Constantes | UPPER_SNAKE | `PHASE_ORDER`, `MAX_PAGES` |
| Types/interfaces | PascalCase | `AuditWithPhases`, `FindingInput` |
| Enum values | `'kebab-case'` string | `'queued' \| 'running' \| 'completed'` |
| DB columns | snake_case (Drizzle mapper) | `organization_id`, `created_at` |
| TS props/vars | camelCase | `organizationId`, `createdAt` |

## Structure des imports

```ts
// Ordre : externes → internes → relatifs
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { db } from '@/lib/db'
import { audits } from '@/lib/db/schema'
import { authenticateRequest } from '@/lib/auth/authenticate'
import type { Audit } from './types'
```

## Commentaires

Aucun commentaire par défaut. Seulement si le **POURQUOI** est non-obvious :
```ts
// DNS rebinding guard : `isPrivateIP(hostname)` ne suffit pas — résoudre d'abord
const { address } = await dns.lookup(url.hostname, { family: 4 })
```

Jamais de commentaire sur le **QUOI** — les noms de variables et de fonctions suffisent.

## Erreurs et edge cases

```ts
// Route API : erreurs explicites, status codes sémantiques
if (!audit) return Response.json({ error: 'Audit introuvable' }, { status: 404 })
if (audit.organizationId !== org.id) return Response.json({ error: 'Accès interdit' }, { status: 403 })

// Worker/engine : logger l'erreur, mettre à jour le status en DB
try {
  await runPhase(phase, audit)
} catch (error) {
  await markPhaseFailed(audit.id, phase, error.message)
  // Continuer les phases suivantes (resilience)
}
```

## Multi-tenant — règle absolue

```ts
// TOUJOURS filtrer par organizationId
// JAMAIS une requête sans eq(audits.organizationId, org.id)
const result = await db.select()
  .from(audits)
  .where(and(
    eq(audits.organizationId, org.id),  // ← obligatoire
    eq(audits.id, auditId)
  ))
```

## Commits

Format : `type(scope): message court en français impératif`

```
feat(audit): ajouter mode flash 15s
fix(pdf): corriger timing Puppeteer recharts
security: ajouter SSRF DNS-based check
perf(db): ajouter 3 index manquants
test(report): ajouter tests régression qualité
```

Types : `feat`, `fix`, `security`, `perf`, `test`, `refactor`, `docs`, `chore`.

Jamais de `--no-verify`. Jamais de secrets dans les commits.

## Conventions log

```ts
// lib/observability/logger.ts
import { logger } from '@/lib/observability/logger'

logger.info({ auditId, orgId, phase, durationMs }, 'Phase completed')
logger.error({ auditId, error: err.message }, 'Phase failed')
// PAS de console.log en production
// PAS de HTML source dans les logs (PII)
```
