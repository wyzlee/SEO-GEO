# Status — SEO-GEO
> Mise à jour : 2026-04-18 — Sprint 1 terminé à 80% — commit 4c552ae en prod

---

## Sprint 1 — Quick Wins ✅ (8/10)

| Item | Description | État |
|------|-------------|------|
| S1.1 | Env vars prod (RESEND + CrUX) | ✅ DONE |
| S1.2 | Smoke test prod | ⏳ À FAIRE après deploy Vercel |
| S1.3 | Monitoring Sentry | ✅ DONE — 5% sampling, PII off, replay off |
| S1.4 | Legal sous-traitants | ✅ DONE — Vercel, Anthropic, Google ajoutés |
| S1.5 | Canal support email | ✅ DONE — sidebar + rapport |
| S1.6 | 5 tests régression rapport | ✅ DONE — 287/288 tests verts |
| S1.7 | Fix PDF charts timing | ⏳ ATTEND résultat S1.2 |
| S1.8 | Section Forces rapport | ✅ DONE — phases ≥ 70% score |
| S1.9 | 3 index DB | ✅ DONE — migration appliquée Neon prod |
| S1.10 | SSRF DNS check | ✅ DONE — assertSafeDnsUrl() |

**S1.2 → tester sur `seo-geo-orcin.vercel.app` : login → audit → rapport → PDF → partage**
**S1.7 → fixer après validation smoke test**

---

## Palier commercial

| Palier | État | Bloquant |
|--------|------|----------|
| A — Agency Ready | 🟢 95% | S1.2 smoke test |
| B — Quality Gate ($1500+) | 🟢 85% | S1.7 PDF charts |
| C — Self-serve (scale) | 🔴 10% | Sprint 2 complet |

---

## Sprint 2 — En cours

| Item | Description | Effort | Impact | État |
|------|-------------|--------|--------|------|
| S2.1 | Landing page — CTA "Commencer gratuitement" | 2j | 🔵 SCALE | ✅ DONE — 2026-04-18 |
| S2.2 | Signup public + onboarding wizard | 3j | 🔵 SCALE | ✅ DONE — 2026-04-18 |
| S2.3 | Stripe 3 plans + webhooks | 3j | 🔵 SCALE | ✅ DONE — 2026-04-18 |
| S2.4 | Phase synthesis — Claude Haiku 4.5 | 2j | 🟡 QUALITÉ | ✅ DONE — 2026-04-18 |
| S2.5 | Queue durable : maxDuration 800s + checkpoint + cron requeue | 3-5j | 🟠 INFRA | ✅ DONE — 2026-04-18 |

**Dépendances Sprint 2 :**
- S2.2 dépend de S2.1 (landing + CTA)
- S2.3 dépend de S2.2 (signup actif)
- S2.4 : nécessite `ANTHROPIC_API_KEY` en prod Vercel
- S2.5 : nécessite Vercel Workflow addon activé sur le projet

**Groupe 1 Sprint 2 (parallélisable) : S2.1, S2.4, S2.5**
**Groupe 2 Sprint 2 (dépend Groupe 1) : S2.2, S2.3**

---

## Phase 1 — Analyse ✅

| Fichier | Contenu | État |
|---------|---------|------|
| `codebase-audit.md` | Architecture, stack, data model, features, qualité | ✅ |
| `competitive-analysis.md` | 12 concurrents, tableau comparatif, gaps marché | ✅ |
| `growth-strategy.md` | Monétisation, onboarding, rétention, acquisition | ✅ |
| `tech-recommendations.md` | Queue, PDF, LLM, DB, sécurité, observabilité | ✅ |
| `diagnosis.md` | SWOT complet | ✅ |
| `roadmap.md` | Sprint 1-3 + Backlog | ✅ |
| `executive-summary.md` | Positionnement, top 5, menaces 2026 | ✅ |
| `sources.md` | URLs sourcées | ✅ |

---

## Prochain audit sécurité
→ Lancer `/security-check` avant le premier client payant (non effectué)
