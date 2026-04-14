---
description: Déploie l'app sur le VPS Wyzlee via Docker + Traefik. Build image, push, pull sur VPS, redémarre container, healthcheck. Rollback procédure incluse.
argument-hint: [--rollback]
---

# /deploy-vps

Déploie l'app SEO-GEO sur `seo-geo.wyzlee.cloud` (VPS Wyzlee).

**Prérequis** :
- App build en local (`npm run build` PASS)
- Tests PASS
- Secrets configurés sur le VPS (`.env` hors git)
- Registry Docker configuré (ou build sur VPS directement)
- Traefik déjà en route sur le VPS (c'est le cas pour tous les `*.wyzlee.cloud`)

## Étape 1 — Pre-flight checks

Avant tout déploiement :

1. `git status` → aucun fichier non committé (sauf si deploy depuis working tree explicite)
2. `git log origin/main..HEAD` → pas de commits non-pushés si on deploy depuis origin
3. `npm run typecheck` → PASS
4. `npm run lint` → PASS
5. `npm run test` → PASS (si tests existent)
6. `/wyzlee-stack-validate` → PASS
7. `/wyzlee-design-validate` → PASS si UI modifiée

Si un check fail → abort, fix d'abord.

## Étape 2 — Build Docker local (ou CI)

```bash
docker build -t seo-geo:latest -t seo-geo:$(git rev-parse --short HEAD) .
```

Vérifier :
- Build passe sans warning critique
- Image size raisonnable (< 500 MB target pour app Next 16 standalone)
- Tag SHA commit présent (pour rollback traçable)

## Étape 3 — Push image

Deux options :

### Option A — Registry (recommandé si scale)

```bash
docker tag seo-geo:latest <registry>/seo-geo:latest
docker tag seo-geo:latest <registry>/seo-geo:$(git rev-parse --short HEAD)
docker push <registry>/seo-geo:latest
docker push <registry>/seo-geo:$(git rev-parse --short HEAD)
```

### Option B — Build direct sur VPS

```bash
# Copier le code sur VPS
rsync -av --exclude node_modules --exclude .next --exclude .git \
  ./ user@vps-wyzlee:/opt/apps/seo-geo/

# SSH + build sur VPS
ssh user@vps-wyzlee "cd /opt/apps/seo-geo && docker compose build"
```

## Étape 4 — Apply migrations DB (si applicable)

**AVANT** de basculer le container app, apply les migrations :

```bash
ssh user@vps-wyzlee "cd /opt/apps/seo-geo && docker compose run --rm app npm run db:migrate"
```

Si la migration échoue → abort, investiguer, ne pas déployer l'app code incompatible avec l'ancien schema.

Voir `/db-migrate` pour la procédure complète (backup Neon branching, etc.).

## Étape 5 — Basculer le container

```bash
ssh user@vps-wyzlee "cd /opt/apps/seo-geo && docker compose pull && docker compose up -d --force-recreate"
```

Traefik gère la bascule sans downtime grâce aux healthchecks.

## Étape 6 — Healthcheck

```bash
# Attendre 20-30s pour démarrage
sleep 30

# Tester
curl -f https://seo-geo.wyzlee.cloud/api/health
# Expected: {"status":"ok","db":"connected",...}
```

Si healthcheck fail après 60s → rollback immédiat (voir Étape 9).

## Étape 7 — Smoke tests manuels

Tester rapidement les flows critiques :
- Login page accessible (200)
- Dashboard après login (auth works)
- Lancer un audit de test (URL ou existant) → status=running ou completed
- Consulter un audit existant (findings affichés)

## Étape 8 — Monitoring post-deploy

Pendant 15-30 min post-deploy :
- Logs structurés : `ssh user@vps docker logs -f seo-geo-app` → chercher ERROR lines
- Error tracking (Sentry si configuré) : spike d'erreurs ?
- `/api/health` : rester 200
- Latence moyenne `/api/audits` acceptable (< 500ms hors lancement worker)

## Étape 9 — Rollback (`--rollback`)

Si problème détecté :

```bash
ssh user@vps-wyzlee "cd /opt/apps/seo-geo && \
  docker compose stop app worker && \
  docker tag <registry>/seo-geo:<previous-sha> seo-geo:latest && \
  docker compose up -d app worker"
```

Si la migration DB doit aussi rollback :
- Utiliser Neon branching pour promouvoir `pre-migration-<timestamp>` en main
- OU si migration additive (safe) : pas besoin de rollback DB

## Étape 10 — Post-deploy

- Tagger le release dans git : `git tag deploy-$(date +%Y%m%d-%H%M) && git push --tags`
- Mettre à jour `STATUS.md` racine :
  ```
  ## État actuel
  - ✅ Déployé en prod le {{date}} (SHA {{short-sha}})
  - Version : v{{x.y.z}}
  ```
- Annoncer dans canal Slack (si workflow le requiert)

## Secrets sur le VPS

`.env` dans `/opt/apps/seo-geo/.env` — owner `root:root`, `chmod 600`. Contient :

```
DATABASE_URL=...                    # Neon prod
STACK_PROJECT_ID=...
STACK_PUBLISHABLE_CLIENT_KEY=...
STACK_SECRET_SERVER_KEY=...
STACK_WEBHOOK_SECRET=...
GITHUB_OAUTH_CLIENT_ID=...          # Sprint 06
GITHUB_OAUTH_CLIENT_SECRET=...
STORAGE_BUCKET_URL=...              # Sprint 06
```

Template dans repo : `.env.template` (valeurs vides).

## Traefik labels (docker-compose.yml)

Exemple :

```yaml
services:
  app:
    image: seo-geo:latest
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.seo-geo.rule=Host(`seo-geo.wyzlee.cloud`)"
      - "traefik.http.routers.seo-geo.entrypoints=websecure"
      - "traefik.http.routers.seo-geo.tls.certresolver=letsencrypt"
      - "traefik.http.services.seo-geo.loadbalancer.server.port=3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    env_file: .env
    networks:
      - traefik

  worker:
    image: seo-geo:latest
    command: ["node", "dist/worker/index.js"]
    restart: unless-stopped
    env_file: .env
    depends_on:
      - app
```

## Règles strictes

- **Jamais** skip pre-flight checks.
- **Toujours** migrations DB avant app bascule.
- **Toujours** healthcheck avant de passer au monitoring.
- **Toujours** tag SHA pour traçabilité.
- **Jamais** deploy direct sur prod depuis branch non-main.
- **Jamais** secrets dans logs / output shell.

## Edge cases

- **Neon DB down** au moment du deploy → healthcheck fail → rollback automatique via restart policy. Vérifier Neon status page.
- **Migration longue** (> 5 min) → annoncer maintenance window, optionnellement mettre l'app en read-only pendant la migration
- **Worker container freeze** → `docker compose restart worker` individuellement, pas besoin de redeployer tout
- **Certificate Traefik expiré** → normalement Let's Encrypt auto-renouvelle, sinon `docker compose restart traefik` dans l'infra wyz-hub
