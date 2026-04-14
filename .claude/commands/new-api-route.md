---
description: Scaffold une route API Next.js 16 avec authenticateRequest, validation Zod, gestion d'erreur, scope multi-tenant.
argument-hint: <method> <path> "<purpose>"
---

# /new-api-route

Crée une route API Next.js 16 conforme au Golden Stack et aux règles de `.claude/docs/security.md`.

**Usage** : `/new-api-route POST /api/audits "Créer un nouvel audit"`

## Arguments

- `<method>` : `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- `<path>` : chemin sous `app/` (ex: `/api/audits`, `/api/audits/[id]`)
- `<purpose>` : description courte pour commentaire header

## Étapes

### Étape 1 — Déterminer le type de route

- **Route privée** (99 % du temps) → `authenticateRequest` obligatoire
- **Route publique** (rare) → whitelisté : `/api/health`, `/api/webhooks/*` (signature), `/r/:slug` (tokenisée)

### Étape 2 — Créer le fichier route

Fichier : `app/<path>/route.ts`

#### Template route privée (POST avec body)

```ts
import { NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/auth/server'
import { db } from '@/lib/db'
import { <table> } from '@/lib/db/schema'
import { <schemaName> } from '@/lib/types/<feature>'
import { and, eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  // 1. Auth + org scope
  const { user, org } = await authenticateRequest(req)

  // 2. Parse + validate body
  const body = await req.json().catch(() => null)
  const parsed = <schemaName>.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues }, { status: 400 })
  }

  // 3. Logique métier
  const [inserted] = await db.insert(<table>).values({
    organization_id: org.id,
    created_by: user.id,
    ...parsed.data,
  }).returning()

  // 4. Response
  return Response.json({ <feature>: inserted }, { status: 201 })
}
```

#### Template route privée (GET list)

```ts
export async function GET(req: NextRequest) {
  const { org } = await authenticateRequest(req)

  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? undefined

  const rows = await db
    .select()
    .from(<table>)
    .where(and(
      eq(<table>.organization_id, org.id),
      status ? eq(<table>.status, status) : undefined,
    ))

  return Response.json({ <feature>: rows })
}
```

#### Template route privée (GET by id avec ownership)

```ts
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { org } = await authenticateRequest(req)

  const [row] = await db.select().from(<table>).where(and(
    eq(<table>.id, params.id),
    eq(<table>.organization_id, org.id),   // scope tenant obligatoire
  ))

  if (!row) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json({ <feature>: row })
}
```

### Étape 3 — Créer le schema Zod

Fichier : `lib/types/<feature>.ts` (créer si n'existe pas)

```ts
import { z } from 'zod'

export const <schemaName> = z.object({
  field1: z.string().min(1).max(200),
  field2: z.number().int().positive().optional(),
  // ...
})

export type <TypeName> = z.infer<typeof <schemaName>>
```

Messages d'erreur en FR si exposés au user (via `.refine({ message: '...' })`).

### Étape 4 — Ajouter rate limit (si applicable)

Pour routes sensibles (voir `.claude/docs/security.md` section Rate limiting) :
- POST créations → 10/min/user
- Uploads → 5/min/user
- Public tokenized → 60/min/IP

Implémentation V1 : Postgres-based counter (table `rate_limits` simple, TTL gérée par cleanup cron).

### Étape 5 — Documenter

Si c'est une route d'API publique (au sens "utilisée par frontend"), vérifier qu'elle est documentée dans `.claude/docs/architecture.md` section "API routes".

### Étape 6 — Tester

1. `npm run typecheck` → PASS
2. Tester avec curl (ou Postman / Bruno) :
   ```bash
   curl -X POST http://localhost:3000/api/audits \
     -H "Content-Type: application/json" \
     -H "Cookie: <stack-auth-cookie>" \
     -d '{"input_type":"url","target_url":"https://example.com"}'
   ```
3. Vérifier :
   - 401 sans cookie
   - 400 avec body invalide
   - 201 avec body valide
   - Data insérée avec bon `organization_id`

### Étape 7 — Validation finale

- `/wyzlee-stack-validate` (doit rester PASS)
- Agent `qa-reviewer` review : auth présente, org scope OK, Zod validation OK, pas de `sql.raw`, pas de log PII

## Règles strictes

- **`authenticateRequest` en première ligne** de chaque handler privé. Pas d'exception.
- **`organization_id` dans le WHERE** de toute query data métier.
- **Zod validation** avant insert/update. Jamais faire confiance au body.
- **Jamais logger** : cookies, JWTs, body de login, HTML brut client.
- **Erreurs** : FR si exposées au user, EN si log interne seulement.
- **Pas de leak d'existence** : ressource d'une autre org → 404, jamais 403 qui leak l'existence.

## Exemples

```
/new-api-route POST /api/audits "Créer un nouvel audit"
/new-api-route GET /api/audits "Lister les audits de l'org"
/new-api-route GET /api/audits/[id] "Détail d'un audit"
/new-api-route POST /api/audits/[id]/report "Générer le rapport d'un audit"
/new-api-route DELETE /api/audits/[id] "Supprimer un audit (cascade findings/reports)"
```

## Edge cases

- **Public route** (ex: `/api/health`) : pas d'`authenticateRequest`. Commentaire explicite en début du handler expliquant pourquoi.
- **Webhook signé** (ex: `/api/webhooks/stack-auth`) : vérifier signature HMAC AVANT toute logique, rejeter 401 sinon.
- **Route avec upload multipart** : utiliser `req.formData()`, valider taille avant lecture complète (stream-safe), voir Sprint 06.
- **Route avec long work** : retourner 202 Accepted + enqueue, pas bloquer le handler. Voir pattern worker dans `architecture.md`.
