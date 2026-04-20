# Roadmap — SEO-GEO
> Mis à jour le 2026-04-20 (Sprints 3+4 livrés)

---

## Sprint 3 — Quick Wins ✅ (livré 2026-04-20)

Ces items peuvent être faits dans une seule session de travail.

| Quoi | Pourquoi | Où | Effort | Impact |
|------|----------|----|--------|--------|
| ✅ console.log → logger.info | Logs JSON structurés dans Sentry | lib/audit/crawl.ts L~385, L~405 | 20 min | Observabilité |
| ✅ maxRetries: 2 Anthropic | Résilience face aux 529 overloaded | lib/audit/briefs.ts | 30 min | Résilience |
| ✅ waitUntil: 'load' PDF | Évite attente réseau inutile sur HTML local | lib/report/ (render PDF) | 10 min | Perf PDF |
| ✅ Skip link layout | WCAG 2.2 / EAA juin 2025 — conformité légale EU | app/layout.tsx | 30 min | A11y + Légal |
| ✅ next/image + alt admin | WCAG + perf images | app/admin/organizations/[id]/page.tsx, app/admin/members/page.tsx | 1h | A11y + Perf |
| ✅ Guard last owner deletion | Prévention corruption data | app/api/admin/org/members/[userId]/route.ts | 1h | Intégrité |
| ✅ Fix org-admins /api/admin/org/audits | 403 pour org-admins bloquant | app/api/admin/org/audits/route.ts | 2h | Feature |
| ✅ Structured outputs Claude tool_use | Plus robuste que JSON.parse + stripCodeFences | lib/audit/briefs.ts | 3h | Robustesse |
| ✅ Token cost logging Anthropic | Monitoring coût LLM (usage.cache_read_input_tokens) | lib/audit/briefs.ts | 1h | Observabilité |
| ✅ Sentry tag audit_id dans worker | Traces distribuées worker↔API | worker/index.ts | 1h | Observabilité |

---

## Sprint 4 — Améliorations structurantes ✅ (livré 2026-04-20)

| Quoi | Pourquoi | Où | Effort | Impact |
|------|----------|----|--------|--------|
| ✅ CSP Content-Security-Policy-Report-Only | Sécurité critique, EAA, différenciant enterprise | next.config.ts | 4h | Sécurité |
| ✅ Partial results UI | UX GitHub Actions — phases visibles pendant crawl | app/dashboard/audits/[id]/page.tsx + polling | 1j | UX majeur |
| ✅ Score ring animé SVG | Lisibilité immédiate, différenciant visuel | components/audit/score-ring.tsx | 4h | UX |
| ✅ Stepper phases audit en cours | Réduit anxiété sur audits 5-10 min | components/audit/phase-progress.tsx | 2h | UX |
| ✅ Cache CrUX + Wikidata Upstash TTL | Divise ×10 les appels API externes | lib/audit/crux.ts, lib/audit/wikidata.ts | 3h | Perf + Coût |
| ✅ Rate limit global audits running/org | Prévention DDoS crawl | app/api/audits/route.ts | 2h | Sécurité |
| ✅ MSW pour tests API externes | Tests Anthropic/Stripe/Perplexity sans réseau | tests/ + setup vitest | 4h | Tests |

---

## Sprint 5 — Évolutions stratégiques (1-2 semaines)

| Quoi | Pourquoi | Où | Effort | Impact |
|------|----------|----|--------|--------|
| **Sprint 08 complet** : Stripe prod + landing | Débloque acquisition + revenus | Multiple files | 1 sem | Business |
| Alertes régression email | Rétention mécanique — outil perçu comme "sentinel" | lib/email/, app/api/cron/ | 2j | Rétention |
| Cmd+K command palette (cmdk) | Standard B2B 2025 attendu | components/ui/command-palette.tsx | 1j | UX |
| Crawl JS/SPA via Firecrawl optionnel | ~35% des sites SPA non crawlés correctement | lib/audit/crawl.ts | 3j | Coverage |
| Benchmarks sectoriels dans rapport | "Top 30% SaaS FR" — valeur perçue + rétention | lib/report/, lib/audit/benchmark.ts | 3j | Valeur |
| Onboarding checklist persistante | Conversion first-audit | app/dashboard/page.tsx | 2j | Activation |
| Rapport web share + annotations | Lien web > PDF seul pour usage mobile DirMark | app/r/[slug]/, lib/report/ | 3j | Valeur agence |

---

## Backlog — Nice to have

| Quoi | Effort | Impact |
|------|--------|--------|
| Migration worker → Inngest (step-by-step) | 2 sem | Résilience V2 |
| Wikidata lookup phase entity (implémentation réelle) | 3j | Précision score |
| CrUX API live (non static fallback) | 2j | Précision phase perf |
| Delta score between audits sur page de garde rapport | 2j | Rapport valeur |
| Annotations agence sur rapport (commentaires inline) | 3j | White-label |
| CSP enforced (après report-only validé 30j) | 1j | Sécurité |
| Turborepo (seulement si nouveau package distinct) | 3j | DX |
| Contract tests API Anthropic (VCR fixtures) | 2j | Tests |
| PDF cold start mitigation (pré-warm cron) | 1j | Perf |
| Audit logging admin (trail actions) | 2j | Conformité V2 |
| Reduced motion @media explicit | 2h | A11y |
| Guard DNS rebinding TOCTOU (IP post-résolution) | 1j | Sécurité edge case |

---

## Note sur les dépendances

- **Sprint 3** peut démarrer immédiatement — pas de dépendances
- **Sprint 4** : CSP report-only recommandé avant d'activer la prod (Sprint 08)
- **Sprint 5** : les alertes régression nécessitent des audits en production (données réelles)
- **Inngest** : ne migrer qu'après que le claim loop Postgres montre des limites en prod

---

## Estimation ressources

Avec 1 développeur full-time :
- Sprint 3 : 1 jour
- Sprint 4 : 3-4 jours
- Sprint 5 : 2-3 semaines (Sprint 08 inclus)
- Backlog : au fil des besoins client réels
