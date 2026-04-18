# Roadmap — SEO-GEO
> Avril 2026 — Plan d'action en sprints issu du diagnostic SWOT

---

## Sprint 1 — Quick Wins (< 1 semaine, items en heures)

Objectif : atteindre **Palier A complet** (livrable à un client payant cette semaine) et débloquer les régressions qualité rapport.

---

### S1.1 — Env vars prod manquantes
**Quoi** : Configurer `RESEND_API_KEY`, `EMAIL_FROM`, `GOOGLE_CRUX_API_KEY` dans Vercel Dashboard  
**Pourquoi** : Sans email → le client ne sait jamais que son audit est terminé. Sans CrUX → Phase 8 = heuristiques non crédibles pour un rapport >1500€. (Source: `vendable-analyse-globale.md` Palier A)  
**Où** : Vercel Dashboard → Settings → Environment Variables  
**Comment** : `vercel env add RESEND_API_KEY` (prod) + `GOOGLE_CRUX_API_KEY` (gratuit, API Google)  
**Effort** : 30 min  
**Impact** : 🔴 BLOQUANT — débloque email + phase performance  
**Dépendances** : Compte Resend actif, clé CrUX générée  

---

### S1.2 — Smoke test prod end-to-end
**Quoi** : Exécuter et documenter le flow complet sur `seo-geo-orcin.vercel.app`  
**Pourquoi** : Aucune validation documentée du prod réel. Un bug silencieux chez le premier client = mort de la référence. (Source: `vendable-analyse-globale.md` Palier A)  
**Où** : `STATUS.md` (mettre à jour avec résultats), navigateur  
**Comment** :  
1. Login → créer audit URL (ex. wyzlee.com) mode standard  
2. Attendre completion → vérifier email reçu  
3. Générer rapport → vérifier `/r/:slug` HTML (logo, sections non vides)  
4. Télécharger PDF → vérifier pagination + typo  
5. Tester partage depuis navigateur non connecté  
**Effort** : 2h  
**Impact** : 🔴 BLOQUANT — validation prod obligatoire avant facturation  
**Dépendances** : S1.1 (email) terminé  

---

### S1.3 — Monitoring Sentry (free tier)
**Quoi** : Activer Sentry pour errors + performance  
**Pourquoi** : Si un audit échoue en prod (Puppeteer crash, Neon timeout) → silence total. Inacceptable pour un client payant. (Source: `vendable-analyse-globale.md` Palier A, `tech-recommendations.md`)  
**Où** : `next.config.ts`, `instrumentation.ts` (à créer), `package.json`  
**Comment** : `npm install @sentry/nextjs` + wizard Sentry → alertes Slack/email si error rate >1%  
**Effort** : 2h  
**Impact** : 🟠 IMPORTANT — observabilité prod  
**Dépendances** : Compte Sentry  

---

### S1.4 — Legal sous-traitants
**Quoi** : Lister exhaustivement Neon, Stack Auth, Vercel, Anthropic API, Resend dans DPA + Privacy  
**Pourquoi** : Requis pour signature contrat avec agence B2B (RGPD Art. 28). (Source: `vendable-analyse-globale.md` Palier A)  
**Où** : `app/legal/privacy/page.tsx`, `app/legal/dpa/page.tsx`  
**Comment** : Ajouter section "Sous-traitants" avec liste, pays d'hébergement, lien DPA de chaque service  
**Effort** : 1h  
**Impact** : 🟠 IMPORTANT — requis pour deal agence  
**Dépendances** : Aucune  

---

### S1.5 — Canal support client
**Quoi** : `support@wyzlee.cloud` dans footer rapport + app  
**Pourquoi** : Zéro moyen de remonter un bug actuellement. (Source: `vendable-analyse-globale.md` Palier A)  
**Où** : `components/layout/app-shell.tsx`, `lib/report/generate.ts` (footer rapport)  
**Comment** : Ajouter lien mailto + mention dans les rapports générés  
**Effort** : 30 min  
**Impact** : 🟠 IMPORTANT — crédibilité client  
**Dépendances** : Email support configuré  

---

### S1.6 — 5 tests régression qualité rapport
**Quoi** : Créer `tests/lib/report-quality.test.ts` couvrant les 5 régressions connues  
**Pourquoi** : Les 5 défauts identifiés le 2026-04-16 peuvent être réintroduits à tout moment. (Source: `vendable-analyse-globale.md` Palier B, memory `feedback_report_quality.md`)  
**Où** : `tests/lib/report-quality.test.ts` (à créer), `lib/report/generate.ts`, `lib/report/dedup.ts`  
**Comment** :  
1. Test dédup sémantique (phaseKey + normalizedSubject + severity)  
2. Test titres "zéro-value" (finding réel affiché)  
3. Test sections conditionnelles (guard `items.length > seuil`)  
4. Test sprints vides → message positif contextualisé  
5. Test casse noms propres (Google, IA, ChatGPT, Claude)  
**Effort** : 3h  
**Impact** : 🟡 QUALITÉ — protège Palier B  
**Dépendances** : Aucune  

---

### S1.7 — Fix PDF charts (timing Puppeteer)
**Quoi** : Corriger le rendu des charts recharts dans le PDF  
**Pourquoi** : Charts absents = PDF pas vendable >1500€. C'est un timing issue Puppeteer, pas architectural. (Source: `vendable-analyse-globale.md` Palier B, `tech-recommendations.md`)  
**Où** : `app/r/[slug]/pdf/route.ts`, `lib/report/pdf.ts`  
**Comment** : `waitUntil: 'networkidle0'` + `page.waitForSelector('[data-chart-ready]')` + attribut `data-chart-ready` sur le dernier chart rendu  
**Effort** : 4h  
**Impact** : 🟡 QUALITÉ — PDF vendable  
**Dépendances** : S1.2 (smoke test) pour valider le fix  

---

### S1.8 — Section "Forces" avant les findings dans le rapport
**Quoi** : Ajouter 3-5 forces détectées avant la liste de problèmes  
**Pourquoi** : Tous les outils qui ont réduit le "churn psychologique" agences ont ajouté des forces. (Source: `ux-trends.md`, `feedback_report_quality.md`)  
**Où** : `lib/report/generate.ts`, `lib/report/render.ts`  
**Comment** : Extraire findings severity=info + score > seuil par phase → synthèse "Points forts" en top de rapport  
**Effort** : 2h  
**Impact** : 🟡 QUALITÉ — fidélisation  
**Dépendances** : S1.6 (tests régression) pour ne pas casser l'existant  

---

### S1.9 — 3 index DB manquants
**Quoi** : Ajouter index `audits(status, queued_at)` partial, `findings(audit_id, phase_key)`, `audits(org_id, created_at DESC)`  
**Pourquoi** : Ces requêtes sont dans les hot paths (poll worker, rapport par section, dashboard). (Source: `tech-recommendations.md`)  
**Où** : `lib/db/schema.ts`, migration Drizzle dans `drizzle/`  
**Comment** : `/db-migrate` workflow → `drizzle-kit generate` → review → apply prod  
**Effort** : 2h (dont 1h migration)  
**Impact** : 🟡 PERFORMANCE — requêtes worker + dashboard  
**Dépendances** : Aucune  

---

### S1.10 — Fix SSRF DNS-based check
**Quoi** : Ajouter résolution DNS + blocage RFC-1918 post-résolution dans `lib/security/url-guard.ts`  
**Pourquoi** : Le check actuel ne protège pas contre les rebinding attacks DNS. Documenté dans `security.md` mais non implémenté dans `crawl.ts`. (Source: `tech-recommendations.md`)  
**Où** : `lib/security/url-guard.ts`, `lib/audit/crawl.ts`  
**Comment** : `dns.promises.lookup(hostname)` + vérifier l'IP résolue contre la liste RFC-1918 avant de crawl  
**Effort** : 2h  
**Impact** : 🔴 SÉCURITÉ  
**Dépendances** : Aucune  

---

**Total Sprint 1 estimé** : ~19h (≈ 2,5 jours)

---

## Sprint 2 — Améliorations structurantes (1-2 semaines, items en jours)

Objectif : atteindre **Palier B complet** + préparer le go-to-market self-serve.

---

### S2.1 — Landing page marketing
**Quoi** : Page `/` avec pitch, démo/screenshot, CTA "Essai gratuit 14j", tarifs  
**Pourquoi** : `/` → `/login` = aucun visiteur ne comprend le produit. Prérequis absolu avant tout outbound/SEO. (Source: `vendable-analyse-globale.md` Palier C, `growth-strategy.md`)  
**Où** : `app/page.tsx`, `components/marketing/` (à créer)  
**Comment** : Section hero (pitch + screenshot audit), features (SEO + GEO natif + white-label FR), pricing 3 plans, CTA trial. Design system Wyzlee (Cabinet Grotesk + palette sémantique)  
**Effort** : 2 jours  
**Impact** : 🔵 SCALE — prérequis acquisition  
**Dépendances** : Plans Stripe définis (peut être placeholder)  

---

### S2.2 — Signup public + onboarding wizard
**Quoi** : Activer Stack Auth signup public + wizard 3 étapes post-inscription  
**Pourquoi** : Impossible de s'inscrire sans Olivier. Aha moment = premier rapport white-label < 5 min. (Source: `vendable-analyse-globale.md` Palier C, `growth-strategy.md`)  
**Où** : Stack Auth Dashboard (activer signup), `app/onboarding/page.tsx` (à créer)  
**Comment** :  
1. Stack Auth : activer email/password signup  
2. Wizard 3 étapes : nom d'agence → premier audit URL (pré-rempli) → premier rapport  
3. Auto-provision organization à l'inscription  
**Effort** : 3 jours  
**Impact** : 🔵 SCALE — activation self-serve  
**Dépendances** : S2.1 (landing avec CTA)  

---

### S2.3 — Stripe 3 plans + webhooks
**Quoi** : Intégrer Stripe, 3 plans (Free/Pro/Agency), webhooks → `organizations.plan`  
**Pourquoi** : Sans billing = impossible de monétiser au-delà du manuel. (Source: `vendable-analyse-globale.md` Palier C)  
**Où** : `app/api/stripe/` (à créer), `lib/billing/` (à créer), `lib/db/schema.ts` (ajouter `stripeCustomerId`)  
**Comment** :  
- Free : 1 audit flash/mois  
- Pro $49/mo : 10 audits/mois, tous modes  
- Agency $149/mo : illimité + white-label + webhooks  
- Webhooks : `customer.subscription.updated` → update plan en DB  
**Effort** : 3 jours  
**Impact** : 🔵 SCALE — monétisation  
**Dépendances** : S2.2 (signup), Compte Stripe  

---

### S2.4 — Phase synthesis — Claude Haiku 4.5
**Quoi** : Implémenter le LLM call en phase 11 avec prompt caching  
**Pourquoi** : Phase 11 placeholder = rapport incomplet. Coût < €2/mois pour 50 audits (Haiku 4.5 + prompt caching). (Source: `tech-recommendations.md`, codebase)  
**Où** : `lib/audit/phases/synthesis.ts`, `lib/audit/process.ts`  
**Comment** : Appel Claude Haiku 4.5 (`claude-haiku-4-5-20251001`), system prompt caché (signaux SEO/GEO), streaming SSE via Next.js App Router, output : 3 paragraphes synthèse executive  
**Effort** : 2 jours  
**Impact** : 🟡 QUALITÉ — rapport complet  
**Dépendances** : `ANTHROPIC_API_KEY` en prod, S1.6 (tests régression)  

---

### S2.5 — Vercel Workflow WDK (queue durable)
**Quoi** : Migrer `processAudit()` vers Vercel Workflow WDK (`"use workflow"` + steps)  
**Pourquoi** : WDK GA le 16 avril 2026, zero infra, retry natif, >100M runs en prod. Remplace la queue Postgres polling fragile. (Source: `tech-recommendations.md`, Vercel changelog avril 2026)  
**Où** : `lib/audit/process.ts`, `app/api/audits/route.ts`, `worker/index.ts`  
**Comment** : Chaque phase = 1 step `"use step"`, workflow orchestrateur wrappé `"use workflow"`, trigger depuis l'API route  
**Effort** : 3-5 jours  
**Impact** : 🟠 INFRA — durabilité audits, retry automatique  
**Dépendances** : Vercel Workflow addon activé sur le projet  

---

**Total Sprint 2 estimé** : ~13-15 jours (mais parallélisable 2 personnes → ~8 jours)

---

## Sprint 3 — Évolutions stratégiques (semaines, items en semaines)

Objectif : **Palier C complet** + différenciation durable vs. concurrents.

---

### S3.1 — White-label Silver tier (custom domain + email)
**Quoi** : Custom domain pour les rapports partagés + email expéditeur agence  
**Pourquoi** : Standard 2026 pour fermer les deals agence. Logo+couleurs (Bronze V1 OK) ne suffit plus. (Source: `ux-trends.md`, `competitive-analysis.md` — Search Atlas le propose déjà)  
**Où** : `lib/organizations/branding.ts`, `lib/report/generate.ts`, `app/r/[slug]/page.tsx`  
**Comment** : CNAME DNS vers rapport SEO-GEO + email from = `audit@agence.com` via Resend domain  
**Effort** : 5 jours  
**Impact** : 🔵 DIFFÉRENCIATION — ferme les deals agence >$149/mo  
**Dépendances** : S2.3 (Agency plan Stripe), DNS routing Vercel  

---

### S3.2 — Programme affilié 30% récurrent
**Quoi** : Affiliate program pour la communauté SEO FR/EU  
**Pourquoi** : Ahrefs a fermé son programme en 2024, la communauté SEO cherche une alternative à 30% récurrent. Fenêtre d'opportunité 2026. (Source: `growth-strategy.md`, `competitive-analysis.md`)  
**Où** : Intégration Rewardful ou Lemon Squeezy affiliate  
**Comment** : Lien partenaire → tracking conversions → 30% récurrent 12 mois  
**Effort** : 3 jours  
**Impact** : 🔵 ACQUISITION — canal communauté SEO  
**Dépendances** : S2.3 (Stripe)  

---

### S3.3 — Audit scheduling (cron mensuel)
**Quoi** : Permettre aux clients de planifier des audits récurrents (mensuel/hebdo)  
**Pourquoi** : Clients retainer = 80% du revenue agence. Les audits manuels créent de la friction. (Source: `vendable-analyse-globale.md` Palier C)  
**Où** : `app/dashboard/audits/schedule/` (à créer), Vercel Cron  
**Comment** : Table `scheduled_audits` → Vercel Cron `/api/cron/audits` → trigger audit + email récapitulatif  
**Effort** : 2 jours  
**Impact** : 🔵 RÉTENTION — sticky feature  
**Dépendances** : S2.5 (workflow durable), S2.3 (Agency plan)  

---

### S3.4 — Multi-org UI + org switcher
**Quoi** : Sélecteur d'organisation dans le header pour les agences gérant plusieurs marques  
**Pourquoi** : Agences avec >1 client brand ont besoin de switcher sans re-login. (Source: `vendable-analyse-globale.md` Palier C, codebase — single-org forcé actuellement)  
**Où** : `components/layout/header.tsx`, `lib/auth/context.tsx`  
**Comment** : Dropdown orgs dans le header, switch via cookie org + redirect dashboard  
**Effort** : 1 jour  
**Impact** : 🔵 AGENCE — multi-client management  
**Dépendances** : S2.3 (Stripe multi-org billing)  

---

### S3.5 — SEO contenu propre (blog + docs)
**Quoi** : Blog + docs publics sur `/blog` et `/docs` ciblant les requêtes SEO/GEO  
**Pourquoi** : CAC SEO organique = $290-480 vs $1200 médiane payant. 3.3x meilleurs unit economics. Aucun acteur n'adresse le contenu GEO en français. (Source: `growth-strategy.md`)  
**Où** : `app/blog/`, `app/docs/` (à créer), MDX  
**Comment** : Articles ciblant "llms.txt", "audit GEO", "GEO vs SEO", "optimiser pour ChatGPT" en FR  
**Effort** : Continu (2-3 articles/mois)  
**Impact** : 🔵 ACQUISITION long terme  
**Dépendances** : S2.1 (landing)  

---

## Backlog — Nice to have

| Item | Effort | Raison du report |
|------|--------|-----------------|
| AST parsing code audit (remplacer regex) | 2 semaines | V1 regex fonctionnel, ROI faible avant >100 audits code/mois |
| Playwright crawl (SPA rendering) | 1 semaine | cheerio suffit pour la majorité des sites |
| Rate limiting Redis (Upstash) | 1 jour | In-memory OK jusqu'à >100 req/min |
| Multi-page crawl hreflang complet (Phase 7) | 3 jours | maxSubPages=20 en full mode couvre 95% des cas |
| Comparaison before/after améliorée (V1.5) | 5 jours | Disponible mais UI delta à améliorer |
| SDK public / CLI | 3 semaines | Après PMF confirmé |
| Wikidata lookup validé (Phase 4) | 2 jours | Entity phase fonctionnelle sans ça |
| Gotenberg PDF (alternative Puppeteer) | 1 semaine | Puppeteer OK après fix S1.7 |
| Axiom log drains | 1 jour | Sentry suffit en V1 |

---

## Récapitulatif priorisé

| Priorité | Sprint | Item | Effort | Impact |
|----------|--------|------|--------|--------|
| 🔴 BLOQUANT | S1.1 | Env vars prod (RESEND + CrUX) | 30 min | Email + Phase perf |
| 🔴 BLOQUANT | S1.2 | Smoke test prod | 2h | Validation prod |
| 🔴 SÉCURITÉ | S1.10 | SSRF DNS-based | 2h | Vecteur SSRF |
| 🟠 IMPORTANT | S1.3 | Sentry monitoring | 2h | Observabilité |
| 🟠 IMPORTANT | S1.4 | Legal sous-traitants | 1h | Deal B2B |
| 🟠 IMPORTANT | S1.5 | Support email | 30 min | Crédibilité |
| 🟡 QUALITÉ | S1.6 | 5 tests régression rapport | 3h | Protect Palier B |
| 🟡 QUALITÉ | S1.7 | PDF charts fix | 4h | PDF vendable |
| 🟡 QUALITÉ | S1.8 | Forces avant findings | 2h | Rapport équilibré |
| 🟡 PERF | S1.9 | 3 index DB | 2h | Dashboard + worker |
| 🔵 SCALE | S2.1 | Landing page | 2j | Prérequis acquisition |
| 🔵 SCALE | S2.2 | Signup + onboarding | 3j | Self-serve |
| 🔵 SCALE | S2.3 | Stripe 3 plans | 3j | Monétisation |
| 🔵 QUALITÉ | S2.4 | Phase synthesis LLM | 2j | Rapport complet |
| 🟠 INFRA | S2.5 | Vercel Workflow WDK | 3-5j | Queue durable |
| 🔵 AGENCE | S3.1 | White-label Silver | 5j | Ferme deals >$149 |
| 🔵 ACQN | S3.2 | Affiliate program | 3j | Canal SEO communauté |
| 🔵 RÉTENTION | S3.3 | Audit scheduling | 2j | Sticky feature |
| 🔵 AGENCE | S3.4 | Multi-org switcher | 1j | Multi-client |
