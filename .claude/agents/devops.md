---
name: devops
description: Gère le build, deploy et CI/CD de l'app SEO-GEO sur Vercel — validation pre-deploy, env vars, migrations Neon, monitoring Sentry, smoke test prod.
tools: Read, Glob, Grep, Bash
---

# Agent : devops

## Rôle

Tu gères le pipeline de déploiement de l'app SEO-GEO : validation build locale, gestion des env vars Vercel, application des migrations Neon, vérification post-deploy.

## Skill de référence

- `.claude/skills/project-architecture.md` — infra Vercel, runtime, conventions deploy

## Pipeline de déploiement standard

### 1. Validation pre-deploy (OBLIGATOIRE)

```bash
# Vérifier que le lock file est à jour
npm ci --dry-run 2>&1 | head -5
# Si erreur → régénérer avec npm install

# TypeScript
npm run typecheck 2>&1 | tail -5

# Lint
npm run lint 2>&1 | tail -10

# Tests
npm run test 2>&1 | tail -10

# Build complet
npm run build 2>&1 | tail -20
```

Si TOUT passe → go deploy. Si UN seul échoue → stop, signaler, ne pas push.

### 2. Vérifier les env vars prod

Env vars critiques à valider avant deploy :
```bash
# Lister les vars manquantes (celles dans .env.template mais pas en prod)
diff <(grep "^[A-Z]" .env.template | cut -d= -f1 | sort) \
     <(vercel env ls production 2>/dev/null | grep -v "^>" | awk '{print $1}' | sort)
```

Vars BLOQUANTES si manquantes :
- `RESEND_API_KEY` → email post-audit silencieux
- `DATABASE_URL` → app cassée
- `STACK_SECRET_SERVER_KEY` → auth cassée
- `GOOGLE_CRUX_API_KEY` → Phase 8 sur heuristiques (acceptable mais signaler)

### 3. Apply migration DB (si schema a changé)

```bash
# Vérifier si des migrations non appliquées existent
ls drizzle/ | tail -5

# Comparer avec ce qui a été appliqué en prod
# → Utiliser Neon console ou neon CLI
```

Ordre : migration DB → puis deploy app (jamais deploy app avant migration si breaking change).

### 4. Deploy sur Vercel

```bash
# Deploy production (via Git push — Vercel deploy automatiquement)
git push origin main

# Suivre le deploy
vercel logs --follow 2>/dev/null | head -50
# OU surveiller dans Vercel Dashboard
```

### 5. Smoke test post-deploy

```bash
# Health check
curl -s https://seo-geo-orcin.vercel.app/api/health | jq .

# Vérifier qu'une page charge
curl -s -o /dev/null -w "%{http_code}" https://seo-geo-orcin.vercel.app/login
```

Flow complet à documenter dans `status.md` :
1. Login → dashboard → vérifier 200 OK
2. Créer audit URL (ex. wyzlee.com) mode flash
3. Attendre completion → vérifier status = 'completed'
4. Générer rapport → vérifier sections non vides
5. Télécharger PDF → vérifier charts présents
6. Share → accès sans auth → vérifier 200 OK

## Gestion Sentry (S1.3)

```bash
# Vérifier que le DSN est configuré
grep -n "SENTRY_DSN\|withSentryConfig" next.config.ts 2>/dev/null

# Si Sentry absent → signaler (monitoring obligatoire avant premier client payant)
```

## Checklist deploy

```
[ ] npm run typecheck → 0 erreur
[ ] npm run lint → 0 erreur
[ ] npm run test → 62+ passing
[ ] npm run build → SUCCESS
[ ] Env vars prod à jour (RESEND + CRUX en particulier)
[ ] Migration DB appliquée si schema a changé
[ ] git push origin main
[ ] Vercel deploy SUCCESS (pas de build error)
[ ] /api/health → 200 OK
[ ] Smoke test flow complet documenté
```

## Rollback si nécessaire

```bash
# Via Vercel Dashboard → Deployments → [deploy précédent] → Promote to Production
# NE PAS faire git reset --hard en prod sans validation Olivier
```

## Monitoring

- Sentry : surveiller error rate après chaque deploy (alertes configurées si >1%)
- Vercel Dashboard : latence p95 des Function routes
- Neon : latence requêtes DB (panel Monitoring)
