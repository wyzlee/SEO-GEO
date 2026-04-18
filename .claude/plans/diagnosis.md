# Diagnostic SWOT — SEO-GEO
> Avril 2026 — Synthèse des analyses codebase, concurrentielle, growth, UX et tech

---

## FORCES — Ce que le projet fait déjà mieux que la concurrence

### F1. Seul outil natif SEO + GEO + llms.txt en français
Aucun concurrent ne combine en un seul rapport : audit SEO technique (11 phases, 100pt) + audit GEO (llms.txt, AI bots, E-E-A-T) + rapport white-label en français. Semrush facture $139 + $99 d'add-on GEO. SEO-GEO le fait nativement.

### F2. Architecture multi-tenant propre dès V1
`organization_id` sur toutes les tables métier, plan-gating via `organizations.plan`, memberships avec rôles — fondation agency-ready sans refactoring.

### F3. Stack technique Golden Stack Wyzlee (53/53 checks)
Next.js 16 + React 19 + Drizzle + Neon HTTP driver + Stack Auth + Zod v4 + Tailwind 4 — aucune dette technique, stack actuelle 2026, déploiement Vercel natif.

### F4. Moteur d'audit fonctionnel en production
11 phases, 3 modes (flash 15s / standard 120s / full 600s), 100pt scoring, crawl URL + zip upload + GitHub clone — tout opérationnel.

### F5. Rapport white-label FR opérationnel
HTML + PDF via Puppeteer, share public 30j TTL, logo injection fonctionnel — différenciateur commercial majeur pour agences.

### F6. Tests exhaustifs (62/62, 351 fichiers)
Vitest + RTL, lint 0 erreur, typecheck strict — base pour évolution sans régression.

---

## FAIBLESSES — Ce qui manque ou est en retard

### W1. Palier A bloqué (non livrable commercialement cette semaine)
5 gaps identifiés dans `vendable-analyse-globale.md` :
- `RESEND_API_KEY` absent en prod → email post-audit silencieux
- Aucun smoke test end-to-end documenté sur prod réel
- Zéro monitoring/alerting (audits échouent silencieusement)
- Pages legal incomplètes (sous-traitants non listés)
- Aucun canal support client

### W2. Charts React non rendus dans le PDF
`recharts` (DOM-dependent) ne se rend pas via Puppeteer server-side → le PDF livré au client n'a pas de visualisations. Problème de timing Puppeteer, pas architectural.

### W3. Phase performance (CrUX) sur heuristiques sans clé API
`GOOGLE_CRUX_API_KEY` absent en prod → Phase 8 tourne sans données réelles → rapport peu crédible pour un client payant 1500€+.

### W4. Phase synthesis (11) = placeholder vide
Aucun LLM call en prod → la section synthesis est absente du rapport.

### W5. Queue worker fragile (fire-and-forget Next.js `after()`)
Audit >60s peut être silencieusement tué sur Vercel. Pas de retry, pas de durabilité. Single-instance only.

### W6. Landing page inexistante
`/` redirige vers `/login` → aucun visiteur organique ne peut s'inscrire ou comprendre le produit.

### W7. Signup public désactivé
Impossible de créer un compte sans Olivier manuellement → bloque tout modèle self-serve.

### W8. 5 régressions qualité rapport connues (non testées)
Dédup sémantique, titres "zéro-value", sections vides, sprints vides, casse noms propres — cf. memory `feedback_report_quality.md`.

### W9. Pas de Stripe / billing
Impossible de facturer automatiquement.

### W10. SSRF DNS-based check absent
`crawl.ts` n'implémente pas la résolution DNS + blocage RFC-1918 post-DNS — vecteur SSRF résiduel documenté dans `security.md`.

---

## OPPORTUNITÉS QUICK-WIN (< 1 jour)

### QW1. Configurer env vars prod manquantes (30 min)
`RESEND_API_KEY`, `EMAIL_FROM`, `GOOGLE_CRUX_API_KEY` dans Vercel Dashboard → débloque Palier A + phase performance.

### QW2. Fix PDF charts — timing Puppeteer (4h)
`waitUntil: 'networkidle0'` + `waitForSelector` ciblé → charts recharts apparaissent dans le PDF.

### QW3. 3 index DB manquants (2h)
`audits(status, queued_at)` partial, `findings(audit_id, phase_key)`, `audits(org_id, created_at DESC)` → requêtes dashboard et rapport x2-3 plus rapides.

### QW4. 5 tests régression rapport (3h)
`tests/lib/report-quality.test.ts` → protège les 5 régressions connues.

### QW5. Canal support minimal (30 min)
`support@wyzlee.cloud` dans le footer + mentions légales.

### QW6. Smoke test prod documenté (2h)
Login → audit → rapport → PDF → share → email notification sur `seo-geo-orcin.vercel.app`.

### QW7. Sentry free tier (2h)
Errors + performance monitoring → alertes si Puppeteer crash ou Neon timeout.

### QW8. Section "Forces" avant findings dans le rapport (2h)
3-5 forces détectées avant la liste de problèmes → churn psychologique des agences réduit.

---

## OPPORTUNITÉS STRATÉGIQUES (> 1 jour)

### OS1. Landing page marketing (2 jours)
`/` avec pitch, démo interactive, CTA "Essai gratuit 14j" → prérequis pour toute acquisition organique ou outbound.

### OS2. Signup public + trial 14j (3 jours)
Stack Auth signup + wizard onboarding 3 étapes → aha moment = premier rapport white-label en < 5 min.

### OS3. Stripe 3 plans + feature gating (3 jours)
Free (1 audit flash/mois) → Pro $49 (10/mois) → Agency $149 (illimité + white-label) → webhooks Stripe → update `organizations.plan`.

### OS4. Vercel Workflow WDK — queue durable (3-5 jours)
Migration `processAudit()` → `"use workflow"` + steps → GA avril 2026, zero infra, retry natif, observabilité intégrée.

### OS5. Phase synthesis — Claude Haiku 4.5 (2 jours)
Coût estimé <€2/mois pour 50 audits/mois agency tier. Prompt caching Anthropic sur system prompt. SSE streaming vers UI via Next.js App Router.

### OS6. Affiliate program 30% récurrent (1 jour setup)
Ahrefs a fermé son programme en 2024 → la communauté SEO FR/EU cherche une alternative. Opportunité directe avec audience LinkedIn SEO.

### OS7. White-label Silver tier — custom domain + email (5 jours)
Logo + couleurs (V1 OK) → custom domain rapports + email expéditeur agence → standard pour fermer les deals agence en 2026.

### OS8. Audit scheduling cron (2 jours)
Clients retainer veulent des audits mensuels automatiques → Vercel Cron simple.

---

## MENACES — Risques si on ne fait rien

### T1. Semrush One accélère sur GEO
Semrush bascule vers un bundle SEO+GEO à $199/mo. Avec la distribution d'une acquisition Adobe ($1.9 Md closing H1 2026), la fenêtre de différenciation se ferme.

### T2. Search Atlas est le concurrent le plus proche
SEO complet + LLM visibility + white-label à $99/mo. Cible les agences déçues d'AgencyAnalytics. Si SEO-GEO ne livre pas de white-label premium et de pricing compétitif dans 3-6 mois, Search Atlas capture le segment.

### T3. AgencyAnalytics déplacement crée une opportunité mais aussi un appel d'offres
La vague de mécontentement post-repricing octobre 2025 cherche une alternative NOW. Fenêtre d'opportunité limitée à 6-12 mois.

### T4. Queue fragile = risque réputation
Un audit silencieusement raté chez un premier client payant peut tuer les références agence.

### T5. Communauté SEO FR sous-adressée
Aucun acteur US n'a vraiment localisé le contenu GEO en français. Si SEO-GEO n'occupe pas ce terrain en 2026, un concurrent local le fera.

---

## Score de maturité commerciale actuelle

| Palier | État | Bloquants |
|--------|------|-----------|
| A — Agency Ready (client direct) | 🟠 75% | Email notif, smoke test, monitoring, legal, support |
| B — Quality Gate ($1500+) | 🟡 50% | Charts PDF, CrUX API, 5 régressions rapport |
| C — Self-serve (scale) | 🔴 10% | Landing, signup, Stripe, onboarding |
