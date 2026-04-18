# Analyse globale — Ce qui reste pour un produit vendable

## Context

Le MVP technique (sprints 00–07) est **terminé et déployé** sur `seo-geo-orcin.vercel.app`. L'app tourne en prod Vercel, Neon production branché, PDF Puppeteer implémenté, rapport HTML white-label avec injection logo fonctionnel. STATUS.md est périmé sur ces points.

La question n'est pas "que reste-t-il à coder" mais **"à quel palier de maturité commerciale est-on"** — et quels gaps bloquent la facturation à chaque palier.

---

## Palier A — Agency Ready (livrer à un client payant cette semaine)

### Gaps bloquants confirmés

**1. Email notifications — `RESEND_API_KEY` à configurer en prod**
- `lib/email/client.ts` est implémenté (Resend via HTTP) mais silent-fail sans la clé env
- Sans cette clé sur Vercel → client ne sait jamais que son audit est terminé
- Action : ajouter `RESEND_API_KEY` + `EMAIL_FROM` + `EMAIL_REPLY_TO` dans Vercel env vars

**2. Smoke test prod end-to-end manquant**
- Aucune validation documentée login → audit → rapport → PDF → partage public sur prod réel
- Action : exécuter et documenter le flow complet sur `seo-geo-orcin.vercel.app`

**3. Monitoring / alerting inexistant**
- Si un audit échoue en prod (Puppeteer crash, Neon timeout) → silence
- Action : activer Vercel Analytics + Sentry (free tier) ou Vercel Log Drains → alertes Slack

**4. Legal — subprocessors manquants dans DPA/Privacy**
- Les pages `/legal/*` existent mais la liste des sous-traitants (Neon, Stack Auth, Vercel, Anthropic API, Resend) doit être exhaustive pour signer avec une agence B2B
- Action : auditer et compléter les pages legal

**5. Support client — canal inexistant**
- Zéro moyen pour un client de remonter un bug / problème sur son rapport
- Action : au minimum un `support@wyzlee.cloud` renvoyant vers Olivier, mention dans le rapport

---

## Palier B — Quality Gate (justifier 1500–3500 €)

### Qualité rapport (5 régressions connues, cf. memory)

Les 5 défauts identifiés le 2026-04-16 ne sont pas couverts par des tests automatiques. Toute modification de `lib/report/generate.ts` peut les réintroduire :
1. Dédup sémantique (clé `phaseKey + normalizedSubject + severity`, pas hash titre)
2. Titres "zéro-value" → afficher le finding réel
3. Sections conditionnelles sans garde `items.length > seuil`
4. Sprints vides → message positif contextualisé
5. Casse noms propres (Google, IA, ChatGPT, Claude…)

→ Action : écrire 5 tests unitaires dans `tests/lib/report-quality.test.ts`

### Performance phase — données réelles

- Phase 8 (CWV) tourne sur heuristiques sans `GOOGLE_CRUX_API_KEY`
- Pour un rapport à 1500€+, "heuristiques" = peu crédible
- Action : configurer `GOOGLE_CRUX_API_KEY` (gratuit, API CrUX Google) en prod

### Wikidata lookup — Entity phase

- Phase 4 (entity) fait du regex sans appel Wikidata réel
- `lib/audit/wikidata.ts` existe mais lookup optionnel / non filé
- Action : configurer ou valider le lookup Wikidata pour les audits full

### PDF — Typographie et charts

- Rapport HTML utilise Inter (Google Fonts), PDF via Puppeteer reproduit le HTML
- Les charts (ScoreBreakdownChart = React recharts) ne s'exportent pas en PDF (DOM React non rendu dans Puppeteer côté serveur)
- Action : soit rendre les charts en SVG statique inline dans le HTML rapport, soit ajouter un screenshot de la page dashboard avant PDF

---

## Palier C — Self-serve (scaler au-delà des clients directs)

### Landing page marketing

- `/` redirige vers `/login` → aucun visiteur organique ne comprend ce que c'est
- Nécessaire avant toute acquisition (outbound, LinkedIn, SEO propre)

### Signup public + onboarding

- Actuellement : impossible de créer un compte sans passer par Olivier manuellement
- Stack Auth supporte le signup public (désactivé) + onboarding guidé à construire

### Stripe — 3 plans

- Free (1 audit/mois), Pro (10/mois), Agency (illimité + white-label)
- Gate dans l'app par `organizations.plan` (champ existe déjà en DB)
- Webhooks Stripe → update plan en DB

### Multi-org UI

- Actuellement : forced single-org (auto-select first membership)
- Agences gérant plusieurs marques clients ont besoin d'un sélecteur

### Audit scheduling

- Clients retainer veulent des audits mensuels automatiques sans action manuelle
- Cron simple via Vercel Cron ou Worker dédié

---

## Récapitulatif priorisé

| Priorité | Action | Palier | Effort |
|----------|--------|--------|--------|
| 🔴 BLOQUANT | Configurer `RESEND_API_KEY` en prod Vercel | A | 30 min |
| 🔴 BLOQUANT | Smoke test prod documenté (login→audit→PDF→share) | A | 2h |
| 🟠 IMPORTANT | Sentry ou Vercel Analytics + alertes | A | 2h |
| 🟠 IMPORTANT | Legal — liste subprocessors complète | A | 1h |
| 🟠 IMPORTANT | Canal support client (email min) | A | 30 min |
| 🟡 QUALITÉ | 5 tests régression rapport (`report-quality.test.ts`) | B | 3h |
| 🟡 QUALITÉ | `GOOGLE_CRUX_API_KEY` configuré | B | 1h |
| 🟡 QUALITÉ | Charts PDF (SVG statique dans HTML rapport) | B | 4h |
| 🟡 QUALITÉ | Wikidata lookup validé/filé | B | 2h |
| 🔵 SCALE | Landing page marketing | C | 2j |
| 🔵 SCALE | Signup public + onboarding | C | 3j |
| 🔵 SCALE | Stripe 3 plans | C | 3j |
| 🔵 SCALE | Multi-org UI | C | 1j |
| 🔵 SCALE | Audit scheduling (cron) | C | 1j |

---

## Fichiers critiques concernés

- `lib/email/client.ts` — clé manquante (env Vercel)
- `lib/report/generate.ts` + `lib/report/render.ts` — qualité rapport
- `lib/audit/crux.ts` — CrUX API
- `lib/audit/wikidata.ts` — Entity lookup
- `tests/lib/report-quality.test.ts` — à créer
- `app/page.tsx` — landing (C)
- Vercel Dashboard → env vars → `RESEND_API_KEY`, `GOOGLE_CRUX_API_KEY`

---

## Vérification end-to-end (smoke test prod à faire)

1. `seo-geo-orcin.vercel.app/login` → s'authentifier
2. Créer un audit URL (ex. wyzlee.com) en mode standard
3. Attendre completion → vérifier email de notification reçu
4. Ouvrir l'audit → générer rapport
5. Ouvrir `/r/:slug` → vérifier HTML correct (logo, couleurs, sections non vides)
6. Télécharger PDF → vérifier pagination, typographie
7. Tester le lien de partage depuis un navigateur non connecté
