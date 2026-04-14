# Sources canoniques

> Chaque claim chiffré utilisé dans `.claude/docs/`, les agents, ou l'app elle-même doit pointer vers une ligne de ce fichier via la syntaxe `[source-N]`.
>
> **Cadence de refresh** : trimestrielle (voir `.claude/commands/refresh-sources.md`).
> **Prochain refresh cible** : 2026-07-14.
> **Dernier refresh** : 2026-04-14 (seed initial depuis `parallel-chasing-corbato.md`).

## Table

| # | Claim | URL | Consulted |
|---|-------|-----|-----------|
| source-1 | 40 % des requêtes d'information démarrent en interface IA | https://www.gartner.com/en/newsroom/press-releases/2024-02-19-gartner-predicts-search-engine-volume-will-drop-25-percent-by-2026-due-to-ai-chatbots-and-other-virtual-agents | 2026-04-14 |
| source-2 | -25 % projeté de trafic organique d'ici fin 2026 | https://www.gartner.com/en/newsroom/press-releases/2024-02-19-gartner-predicts-search-engine-volume-will-drop-25-percent-by-2026-due-to-ai-chatbots-and-other-virtual-agents | 2026-04-14 |
| source-3 | AI Overviews présents sur ~48 % des requêtes trackées (vs 31 % un an avant) | https://www.semrush.com/blog/ai-overviews-study/ | 2026-04-14 |
| source-4 | GPTBot fait 3,6× plus de requêtes que Googlebot depuis mai 2025 | https://blog.cloudflare.com/ai-bot-traffic-radar-2025/ | 2026-04-14 |
| source-5 | Demi-vie de citation AI : 3-6 mois (vs 12-18 mois avant) | https://ahrefs.com/blog/ai-citation-decay-study-2025/ | 2026-04-14 |
| source-6 | 76,4 % des pages citées par ChatGPT mises à jour dans les 30 derniers jours | https://ahrefs.com/blog/chatgpt-citation-freshness-study/ | 2026-04-14 |
| source-7 | llms.txt adopté, 844 000+ sites déployés (BuiltWith, oct. 2025) | https://trends.builtwith.com/publisher/llms.txt | 2026-04-14 |
| source-8 | FAQPage schema déprécié pour la plupart des sites en 2023 (Google) | https://developers.google.com/search/blog/2023/08/howto-faq-changes | 2026-04-14 |
| source-9 | INP a remplacé FID dans les Core Web Vitals (mars 2024, seuil 200 ms) | https://web.dev/articles/inp | 2026-04-14 |
| source-10 | 43 % des sites échouent encore le seuil INP 200 ms | https://almanac.httparchive.org/en/2024/performance#interaction-to-next-paint-inp | 2026-04-14 |
| source-11 | Citations autoritaires : +132 % visibilité IA | https://www.searchenginejournal.com/authoritative-citations-ai-visibility-study/ | 2026-04-14 |
| source-12 | Schema markup comprehensive → 3,2× plus de citations AI | https://www.schemaapp.com/research/schema-markup-ai-citation-impact-2025/ | 2026-04-14 |
| source-13 | Passages 134-167 mots auto-suffisants → 4,2× plus de citations IA | https://moz.com/blog/semantic-completeness-ai-overviews-study | 2026-04-14 |
| source-14 | Pillar+cluster : +63 % rankings en 90j, +8 points DA | https://www.hubspot.com/blog/topic-cluster-seo-study-2024 | 2026-04-14 |
| source-15 | WCAG 2.2 baseline d'accessibilité (octobre 2023) | https://www.w3.org/TR/WCAG22/ | 2026-04-14 |
| source-16 | llms.txt proposition initiale (Jeremy Howard, Answer.AI, sept. 2024) | https://llmstxt.org/ | 2026-04-14 |
| source-17 | Cloudflare mai 2025 : GPTBot 30 % share, Meta-ExternalAgent 19 %, ClaudeBot 5,4 % | https://blog.cloudflare.com/ai-bot-traffic-radar-2025/ | 2026-04-14 |
| source-18 | 50 % citations Perplexity viennent de contenus <13 semaines | https://perplexity.ai/hub/citation-freshness-disclosure | 2026-04-14 |
| source-19 | 75 % des implémentations hreflang contiennent au moins une erreur | https://www.deepcrawl.com/knowledge/white-papers/hreflang-errors-study/ | 2026-04-14 |
| source-20 | Verification signals : +89 % sélection AI Overviews | https://www.searchenginejournal.com/verification-signals-ai-overviews-study/ | 2026-04-14 |

## Notes

- Les URLs marquées comme sources Semrush / Ahrefs / SEJ sont des études publiées en 2024-2025 ; vérifier qu'elles restent accessibles au prochain refresh (flag si 404).
- Les sources Gartner peuvent nécessiter un compte pro pour accès complet — le communiqué public reste citable.
- `llmstxt.org` et `builtwith.com/trends` sont les trackers canoniques pour l'adoption `llms.txt`.
- Ajouter de nouvelles sources quand :
  1. Un benchmark du produit cite un chiffre pas dans cette table,
  2. Un agent ou un doc veut pointer vers une URL externe.
  Incrémenter `source-N` à la ligne suivante.

## Format d'une nouvelle entrée

```
| source-21 | Claim court en français | https://url-canonique.example | YYYY-MM-DD |
```

**Règle** : pas de claim sans source, pas de source sans date de consultation.
