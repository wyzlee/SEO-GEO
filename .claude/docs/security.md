# Security

## Auth boundaries

**Règle 1** : toute route API non-publique commence par `await authenticateRequest(req)` (pattern wyz-scrib `lib/auth/server.ts`).

**Règle 2** : `authenticateRequest` :
1. Lit le JWT Stack Auth depuis cookie (`tokenStore: 'cookie'`)
2. Vérifie la signature via `jose` + remote JWKS (`https://api.stack-auth.com/api/v1/projects/<id>/.well-known/jwks.json`)
3. Charge `user` depuis DB locale (sync via webhook Stack Auth)
4. Charge `memberships` pour connaître les orgs du user
5. Extrait `organization_id` de la requête (header `x-org-id` ou body)
6. Vérifie que le user est membre de cette org
7. Rejette :
   - 401 si JWT absent/invalide
   - 403 si user pas membre de l'org demandée
   - 404 si la ressource demandée n'appartient pas à l'org (jamais leak l'existence)

**Règle 3** : **aucune query de data domain sans `organization_id` dans le `WHERE`**. Un middleware Drizzle ou une helper dédiée (voir `data-model.md` `getAuditsForOrg`) encapsule ce scope.

## Routes publiques (whitelistées)

- `GET /api/health` — healthcheck, pas d'info sensible
- `GET /r/:slug` — rapport partageable (lien tokenisé, voir plus bas)
- `POST /api/webhooks/stack-auth` — signature vérifiée (HMAC secret partagé)

Toutes les autres routes = privées par défaut.

## Share links (rapports publics)

- `reports.share_slug` = token aléatoire 32 chars (nanoid ou crypto.randomUUID variant)
- `reports.share_expires_at` : default 30 jours, max 1 an
- Aucun bruteforce possible (espace de clés suffisamment grand + rate limit sur `/r/:slug`)
- Le rapport rendu sur `/r/:slug` ne révèle **pas** le nom de l'org, seulement le nom client si présent
- Option future : password-protected shares

## Secrets

**Interdits dans git** :
- `.env`, `.env.local`, `.env.production`
- Fichiers de config contenant des clés API, DB URLs, webhook secrets

**Committé** :
- `.env.template` — liste des variables attendues, valeurs vides ou placeholder

**Variables attendues** (par catégorie) :
- `DATABASE_URL` — Neon HTTP connection string
- `STACK_PROJECT_ID`, `STACK_PUBLISHABLE_CLIENT_KEY`, `STACK_SECRET_SERVER_KEY` — Stack Auth
- `STACK_WEBHOOK_SECRET` — pour vérification webhooks
- `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET` (Sprint 06)
- `STORAGE_BUCKET_*` (si upload code activé, S3-compat)

Sur le VPS : secrets injectés via `docker-compose` depuis un `.env` hors git, propriétaire `root:root`, `chmod 600`.

## Upload de code (Sprint 06) — sandboxing

Input : zip file (max 50 MB) ou GitHub repo connection.

**Guards obligatoires** :

1. **Filesize limit** : rejeter si zip > 50 MB upload (avant extraction).
2. **Zip bomb guard** : pendant extraction, abort si total décompressé > 500 MB OU si ratio compression > 100:1.
3. **Path traversal** : refuser toute entry avec `..`, chemins absolus, symlinks pointant hors du dossier extrait.
4. **Extension whitelist** : extraire seulement `.ts .tsx .js .jsx .json .md .mdx .html .css .scss .vue .astro .svelte .yml .yaml .toml`. Ignorer le reste (images, binaires, `.git`, `node_modules`).
5. **No code execution** : jamais `require()`, `import()`, `eval()`, `exec()`, `spawn()` sur le code uploadé. Parsing uniquement via AST lib (TypeScript compiler API, cheerio pour HTML).
6. **Timeout** : parsing d'un repo upload doit finir en < 5 min wall-time. Kill le job sinon.
7. **Storage éphémère** : code extrait vit dans `/tmp/audit-<uuid>/` ou bucket dédié à retention 24h max, cleanup via cron.
8. **GitHub OAuth scope minimal** : `repo:read` seulement (ou `public_repo` si le user veut seulement audit public).
9. **Clone shallow** : `git clone --depth=1` pour GitHub, pas d'historique.

**Logs** : ne jamais logger le contenu de fichier uploadé. Logger seulement métadonnées (chemin, taille, extension, hash SHA256).

## Gestion PII client

**Collecté strictement nécessaire** :
- `client_name`, `consultant_name` (fields optionnels audit, FR)
- `target_url` (URL publique du site client — pas sensible)
- Findings structurés (pas HTML brut du site)

**JAMAIS stocké** :
- HTML complet du site audité (seulement snippets cités dans findings, max 500 chars chacun)
- Cookies utilisateur du site audité (ils n'apparaissent pas, on est en crawl anonyme)
- Données client (emails, téléphones scrapés de la page — on scrape pas ça)

**Retention** :
- `audits` + `findings` : durée illimitée par défaut (valeur business pour le client)
- `reports.content_html` : 1 an si `share_expires_at` non défini
- Logs : 90 jours max

**Droit à l'oubli** (RGPD) :
- Endpoint `DELETE /api/audits/:id` disponible au owner de l'org
- Cascade delete sur `audit_phases`, `findings`, `reports`

## Rate limiting

Sur routes sensibles :

- `POST /api/audits` — 10 / minute / user, 100 / jour / org (plan free en V2), plus élevé V1 agency
- `POST /api/uploads/code` — 5 / minute / user, 20 / jour / org
- `POST /api/auth/*` (Stack Auth) — géré par Stack Auth lui-même
- `GET /r/:slug` — 60 / minute / IP (anti-scraping)

Implémentation V1 : Postgres-based rate limiter (pas Redis, cohérence avec infra simple). V2 : Redis si latence ou scale l'impose.

## Validation inputs

**Tous** les inputs API sont validés par Zod (schemas dans `lib/types/`) AVANT insert DB.

Exemple :
```ts
import { z } from 'zod'

export const createAuditSchema = z.object({
  input_type: z.enum(['url', 'zip', 'github']),
  target_url: z.string().url().optional(),
  upload_id: z.string().uuid().optional(),
  github_repo: z.string().regex(/^[\w-]+\/[\w.-]+(@[\w.-]+)?$/).optional(),
  mode: z.enum(['full', 'quick']).default('full'),
  client_name: z.string().max(200).optional(),
  consultant_name: z.string().max(200).optional(),
}).refine(
  (data) =>
    (data.input_type === 'url' && data.target_url) ||
    (data.input_type === 'zip' && data.upload_id) ||
    (data.input_type === 'github' && data.github_repo),
  { message: 'Input mismatch with input_type' }
)
```

Rejet 400 si schema fail, avec `ZodError.issues` serialized (attention : Zod v4 utilise `.issues` pas `.errors`).

## SQL injection

Drizzle ORM paramètre tout. **Jamais** de `sql.raw(userInput)` ou concaténation de strings dans une query.

Si besoin de requête dynamique (ex: filtres UI), utiliser `drizzle-orm` conditions (`and`, `or`, `eq`, `ilike`) jamais de string building.

## XSS

- Next.js échappe par défaut dans JSX
- **Jamais** de `dangerouslySetInnerHTML` sauf sur contenu **serveur-généré dans notre contrôle** (ex: rapport Markdown → HTML via `marked` + `DOMPurify`)
- Les `findings.description` / `findings.recommendation` sont en **Markdown** (pas HTML). Rendus client via `react-markdown` avec sanitization.

## CSP + headers

`next.config.ts` :

```ts
{
  headers: async () => [{
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      // CSP : à définir progressivement, commencer report-only
    ],
  }]
}
```

## Logging sécurisé

- Logs structurés (JSON) via `pino` ou équivalent léger
- **Jamais** logger : password, JWT, cookies, API keys clients, HTML brut site audité, contenu upload
- Logger : user_id (pas email), org_id, audit_id, timestamp, latency, status code, error type (pas stack complet en prod si contient de la data)
- Retention logs 90 jours

## Pre-commit / CI checks

À activer dès Sprint 01 :
- `npm run typecheck` bloquant
- `npm run lint` (ESLint + Tailwind plugin)
- Scan secrets (ex: `gitleaks` ou équivalent léger)
- `/wyzlee-stack-validate` manuel avant chaque release

## Incident response

En cas de compromission supposée (clé leakée, JWT forgé, etc.) :
1. Rotate tous les secrets (Stack Auth keys, DATABASE_URL, GitHub OAuth)
2. Invalider toutes les sessions Stack Auth actives (dashboard Stack Auth)
3. Audit logs dernières 72h
4. Notifier org owners si data exposure
5. Post-mortem écrit dans `.claude/docs/incidents/<date>-<short-name>.md`
