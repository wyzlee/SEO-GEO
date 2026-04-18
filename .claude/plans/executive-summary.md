# Executive Summary — SEO-GEO
> Avril 2026 — Phase 1 complète

---

## Contexte (avril 2026)

SEO-GEO est le **seul outil d'audit combinant SEO technique + GEO natif (llms.txt, AI bots, E-E-A-T) avec rapport white-label en français**. Le marché SEO SaaS est dominé par Semrush ($471M ARR, en cours d'acquisition Adobe) et Ahrefs ($149M, +49% YoY). Le GEO devient mainstream : Semrush a lancé son bundle SEO+GEO à $199/mo en octobre 2025. La fenêtre de différenciation est ouverte mais se referme dans 12-18 mois.

## État actuel

Le MVP technique (sprints 00-07) est **terminé et déployé** sur Vercel (`seo-geo-orcin.vercel.app`). Stack exemplaire (53/53 Golden Stack), 11 phases d'audit fonctionnelles, 62/62 tests. Mais **le produit n'est pas encore livrable commercialement** : 5 bloquants Palier A à résoudre en 19h de travail.

## 5 chiffres clés

- **Fenêtre concurrentielle** : 12-18 mois avant que Semrush+Adobe et Search Atlas comblent le gap GEO+FR+white-label
- **Pricing** : $149/mo Agency = bas de fourchette (concurrents $149-499) — bien positionné
- **Time to Palier A** : 19h de travail (env vars, smoke test, monitoring, legal, support, qualité)
- **Coût phase synthesis Claude Haiku** : <€2/mois pour 50 audits/mois agency tier
- **LTV client agency estimé** : ~$5 960 (à $149/mo, 30% churn annuel) → CAC supportable $1 490

## Top 5 actions à fort impact

1. **Configurer env vars prod** (RESEND + CrUX) — 30 min — débloque email + phase performance
2. **Smoke test prod end-to-end** — 2h — validation prod obligatoire avant facturation
3. **Fix PDF charts** (timing Puppeteer) — 4h — PDF vendable >1500€
4. **5 tests régression rapport** — 3h — protège la qualité Palier B
5. **Landing page + signup public** — 5 jours — prérequis pour tout go-to-market

## Positionnement différenciant

Aucun concurrent ne combine en un seul rapport à $149/mo :
- Audit SEO technique complet (11 phases, 100pt)
- Audit GEO natif (llms.txt, AI bots, E-E-A-T)
- Rapport white-label en français
- Multi-tenant agence dès V1

La combinaison Semrush classique + AI Visibility Toolkit coûte **$238+/mo** sans white-label ni français.

## Principale menace 2026

L'acquisition Adobe/Semrush (closing H1 2026) va apporter une distribution massive au bundle SEO+GEO. **Il faut occuper le terrain agency FR avant le closing**, notamment via du contenu GEO en français et un programme affilié communauté SEO.
