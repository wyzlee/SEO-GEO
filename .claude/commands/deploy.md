---
description: Pipeline deploy complet — build + tests + security check + push Vercel. S'arrête si un check échoue. Vérifie les env vars prod et les migrations DB avant deploy.
---

# /deploy

Pipeline de déploiement complet SEO-GEO → Vercel production.

**Usage** : `/deploy`

## Prérequis

Ce pipeline **ne force jamais** un deploy si un check échoue. Chaque étape est un gate.

## Étape 1 — Validation locale

```bash
npm run typecheck
```
→ Si erreur TypeScript → STOP. Afficher les erreurs.

```bash
npm run lint
```
→ Si erreur ESLint → STOP. Afficher les erreurs.

```bash
npm run test
```
→ Si test failing → STOP. Afficher les tests échoués.

```bash
npm run build
```
→ Si build error → STOP. Afficher l'erreur.

## Étape 2 — Vérifier le lock file

```bash
# Vérifier que package-lock.json est à jour
git diff --name-only HEAD | grep "package.json"
```
Si `package.json` a changé mais pas `package-lock.json` → lancer `npm install` et inclure dans le commit.

## Étape 3 — Security check

Invoquer `/security-check`.

→ Si findings CRITIQUES → STOP. Ne pas déployer. Corriger d'abord.
→ Si findings IMPORTANTS → Afficher un warning. Demander confirmation avant de continuer.

## Étape 4 — Vérifier les env vars prod

Vérifier que les vars critiques sont configurées :
- `DATABASE_URL` — si absente → STOP CRITIQUE
- `STACK_SECRET_SERVER_KEY` — si absente → STOP CRITIQUE
- `RESEND_API_KEY` — si absente → WARNING (email silencieux)
- `GOOGLE_CRUX_API_KEY` — si absente → WARNING (Phase 8 sur heuristiques)

## Étape 5 — Vérifier les migrations DB

Lister les fichiers dans `drizzle/` et vérifier si des migrations non appliquées existent.

Si nouvelle migration non appliquée → informer l'utilisateur :
```
⚠️ Migration DB détectée : drizzle/[timestamp]_[name].sql
→ Appliquer via Neon console ou neon CLI avant le deploy
→ Confirmer quand c'est fait
```

Attendre la confirmation avant de continuer.

## Étape 6 — Deploy

```bash
git push origin main
```

Vercel détecte le push et déploie automatiquement.

Surveiller les logs pendant 2 minutes :
```bash
# Via Vercel CLI si disponible
vercel logs --follow 2>/dev/null | head -100
```

## Étape 7 — Smoke test post-deploy

```bash
# Health check
curl -s https://seo-geo-orcin.vercel.app/api/health
# → Doit retourner {"status":"ok"}

# Login page
curl -s -o /dev/null -w "%{http_code}" https://seo-geo-orcin.vercel.app/login
# → Doit retourner 200
```

Documenter les résultats dans `.claude/plans/status.md`.

## Rapport final

Afficher :
```
✅ Deploy terminé

Commit : [hash]
Déployé sur : https://seo-geo-orcin.vercel.app
Health check : OK
Durée pipeline : ~Xmin

⚠️ Warnings : [liste si applicable]
```

## Rollback

Si le deploy échoue ou si des erreurs apparaissent post-deploy :
```
→ Via Vercel Dashboard : Deployments → [deploy précédent] → Promote to Production
→ Ne PAS faire git reset --hard sans validation Olivier
```

## Règles

- Jamais `--no-verify` sur le git push
- Jamais de deploy le vendredi après 17h sans raison urgente
- Toujours documenter les warnings dans status.md même si le deploy réussit
