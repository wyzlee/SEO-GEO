---
name: project-architecture
description: Stack technique et structure du projet SEO-GEO — Next.js 16 App Router, Drizzle/Neon, Stack Auth, worker async, Vercel Fluid Compute. Référence pour toute décision d'architecture.
type: skill
---

# Skill : project-architecture

## Stack technique (Golden Stack Wyzlee — 53/53 checks ✅)

| Couche | Technologie | Version | Notes |
|--------|-------------|---------|-------|
| Framework | Next.js | ^16.1.6 | App Router, proxy.ts jamais middleware.ts |
| UI | React | ^19.2.3 | Server Components par défaut |
| Langage | TypeScript | ^5 strict | 0 erreurs en prod |
| ORM | Drizzle ORM | ^0.45.1 | schema dans `lib/db/schema.ts` |
| DB Driver | @neondatabase/serverless | ^1.0.2 | HTTP driver, jamais `pg` brut |
| Auth | @stackframe/react | ^2.8.77 | `tokenStore: 'cookie'`, OIDC JWT |
| JWT | jose | ^6.2.1 | Remote JWKS validation |
| Server state | @tanstack/react-query | ^5.90.21 | |
| Client state | zustand | ^5.0.11 | |
| Validation | zod | ^4.3.6 | `.issues` pas `.errors` |
| Styles | tailwindcss | ^4.1.9 | `@theme {}` dans CSS |
| Icons | lucide-react | ^0.577.0 | override dans package.json |
| Toasts | sonner | ^2.0.7 | seule lib autorisée |
| PDF | puppeteer-core + @sparticuz/chromium | ^24/^147 | 2048 MB, 60s |
| Tests | vitest + RTL | ^4.1.4 | 62/62 passing |
| Crawl | cheerio | ^1.2.0 | statique, Puppeteer fallback SPA |
| Email | Resend | latest | templates dans `lib/email/` |

## Structure critique des dossiers

```
app/api/          → Route handlers REST (authenticateRequest + Zod obligatoires)
app/dashboard/    → Shell protégé (auth check en layout)
app/r/[slug]/     → Rapport public (pas d'auth, TTL 30j)
lib/audit/        → Moteur 11 phases (NE PAS modifier sans tests)
lib/db/           → Schema Drizzle + lazy proxy (pattern critique)
lib/auth/         → Stack Auth + JWT helper
lib/security/     → SSRF guard, rate-limit, IP check
worker/index.ts   → Queue polling (NE TOURNE PAS sur Vercel — fire-and-forget via after())
```

## Pattern lazy proxy Drizzle (OBLIGATOIRE)

```ts
// lib/db/index.ts
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
```

Jamais de connexion TCP, jamais de pool, jamais `pg` brut.

## Auth pattern (OBLIGATOIRE dans toutes les routes API)

```ts
import { authenticateRequest } from '@/lib/auth/authenticate'

export async function GET(req: Request) {
  const { user, org } = await authenticateRequest(req)
  // user.id = Stack Auth user ID
  // org.id = organization_id pour multi-tenant
}
```

## Décisions techniques prises

- **worker/index.ts** ne tourne pas sur Vercel : audits lancés via `after()` en fire-and-forget. Risque timeout >60s documenté → migration Vercel Workflow WDK prévue en S2.5.
- **PDF Puppeteer** : fix requis `waitUntil: 'networkidle0'` pour les charts recharts (bug timing).
- **Rate limiting in-memory** : OK single instance, migration Upstash Redis prévue si >100 req/min.
- **Multi-tenant dès V1** : `organization_id` sur TOUTES les tables métier. Jamais une requête sans filtre org.

## Conventions de fichiers

- Pages : `app/dashboard/[feature]/page.tsx` (Server Component)
- Composants client : `components/[feature]/[name].tsx` + directive `'use client'`
- Hooks : `lib/hooks/use-[feature].ts` (React Query)
- Types Zod : `lib/types/[feature].ts`
- API route : `app/api/[feature]/route.ts`

## Infra déploiement

- Runtime : Vercel Fluid Compute, Frankfurt (aws-eu-central-1)
- `output: 'standalone'` **désactivé** (Vercel gère)
- `/api/health` → 200 OK (obligatoire)
- Env vars dans Vercel Dashboard (jamais en dur)
- Neon DB : même région que Vercel (Frankfurt) → latence 5-15ms
