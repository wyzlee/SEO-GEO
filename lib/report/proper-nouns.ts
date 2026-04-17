/**
 * Capitalisation défensive des noms propres dans les strings générées
 * dynamiquement du rapport.
 *
 * Contexte : Olivier a dû corriger à la main "google et les moteurs ia" →
 * "Google et les moteurs IA" dans un rapport livré. La root cause immédiate
 * (un `.toLowerCase()` sur PHASE_CONTEXT_FR) a été retirée dans le commit
 * `e337101`, mais il reste facile à un futur contributeur de réintroduire le
 * bug en concaténant des strings. Ce module fournit une passe finale qui
 * force la casse canonique sur un dictionnaire de noms propres connus.
 *
 * Règle : on n'applique ce helper QUE sur les strings générées (titres de
 * sections, summaries, executive summary, intros conditionnelles). Pas sur
 * les findings eux-mêmes (qui sont déjà écrits en dur dans les phases avec
 * la bonne casse).
 */

/**
 * Dictionnaire `lowercase pattern` → `canonical form`. Les patterns sont des
 * formes minuscules qu'on veut corriger. `match` peut être une string exacte
 * ou une regex pour couvrir les variantes (ex. `openai` / `open ai`).
 */
interface ProperNounRule {
  match: RegExp
  canonical: string
}

const PROPER_NOUNS: ProperNounRule[] = [
  // Moteurs IA
  { match: /\bchatgpt\b/gi, canonical: 'ChatGPT' },
  { match: /\bgpt-?4o?\b/gi, canonical: 'GPT-4' },
  { match: /\bopen\s*ai\b/gi, canonical: 'OpenAI' },
  { match: /\banthropic\b/gi, canonical: 'Anthropic' },
  { match: /\bperplexity\b/gi, canonical: 'Perplexity' },
  { match: /\bgemini\b/gi, canonical: 'Gemini' },
  { match: /\bcopilot\b/gi, canonical: 'Copilot' },
  { match: /\bbing\b/gi, canonical: 'Bing' },
  { match: /\bclaude\b/gi, canonical: 'Claude' },
  // Attention : "google" en minuscule existe dans des URLs / code — on
  // applique seulement sur word-boundary et on laisse la passe skip code
  // (voir `capitalizeProperNouns` plus bas).
  { match: /\bgoogle\b/g, canonical: 'Google' },
  { match: /\bgooglebot\b/gi, canonical: 'Googlebot' },
  { match: /\bgptbot\b/gi, canonical: 'GPTBot' },
  { match: /\bclaudebot\b/gi, canonical: 'ClaudeBot' },
  { match: /\bperplexitybot\b/gi, canonical: 'PerplexityBot' },
  // Acronymes
  { match: /\bi\.?a\b/gi, canonical: 'IA' }, // "IA", "i.a.", "ia"
  { match: /\bai\s+overviews?\b/gi, canonical: 'AI Overviews' },
  { match: /\bseo\b/gi, canonical: 'SEO' },
  { match: /\bgeo\b/gi, canonical: 'GEO' },
  { match: /\be-?e-?a-?t\b/gi, canonical: 'E-E-A-T' },
  { match: /\bcwv\b/gi, canonical: 'CWV' },
  { match: /\blcp\b/gi, canonical: 'LCP' },
  { match: /\binp\b/gi, canonical: 'INP' },
  { match: /\bcls\b/gi, canonical: 'CLS' },
  { match: /\btbt\b/gi, canonical: 'TBT' },
  { match: /\bfcp\b/gi, canonical: 'FCP' },
  { match: /\bttfb\b/gi, canonical: 'TTFB' },
  { match: /\bserp\b/gi, canonical: 'SERP' },
  { match: /\bhtml\b/gi, canonical: 'HTML' },
  { match: /\bjson-?ld\b/gi, canonical: 'JSON-LD' },
  { match: /\bhttp\b(?!s|:\/\/|\/\w|\w)/gi, canonical: 'HTTP' },
  { match: /\bhttps\b(?!:\/\/|\/\w|\w)/gi, canonical: 'HTTPS' },
  // Outils & services
  { match: /\bwikipedia\b/gi, canonical: 'Wikipedia' },
  { match: /\bwikidata\b/gi, canonical: 'Wikidata' },
  { match: /\bahrefs\b/gi, canonical: 'Ahrefs' },
  { match: /\bsemrush\b/gi, canonical: 'Semrush' },
  { match: /\bsurfer\s*seo\b/gi, canonical: 'Surfer SEO' },
  { match: /\bmoz\b/gi, canonical: 'Moz' },
  { match: /\bschema\.org\b/gi, canonical: 'Schema.org' },
  // Wyzlee / produit
  { match: /\bwyzlee\b/gi, canonical: 'Wyzlee' },
]

/**
 * Remplace les occurrences lowercased des noms propres connus par leur forme
 * canonique, en préservant :
 * - les blocs code inline `` `...` `` (Markdown)
 * - les blocs `<code>...</code>`
 * - les URLs (qui peuvent contenir des patterns comme `google.com`)
 *
 * On applique les regex sur les segments "texte libre" uniquement.
 */
export function capitalizeProperNouns(text: string): string {
  if (!text) return text
  // Split le texte en segments : code / url / texte-libre. On ne traite que
  // les texte-libre. Regex capture :
  //   (a) backticks : `...`
  //   (b) code HTML : <code>...</code>
  //   (c) URLs http(s)://... (arrête sur whitespace ou ponctuation finale)
  const protectedPattern = /(`[^`]+`|<code>[^<]+<\/code>|https?:\/\/[^\s<>"')]+)/g
  const segments = text.split(protectedPattern)

  return segments
    .map((segment, idx) => {
      // Les segments aux index impairs sont les matches capturés (code/URL) :
      // on les laisse intacts.
      if (idx % 2 === 1) return segment
      return applyRules(segment)
    })
    .join('')
}

function applyRules(segment: string): string {
  let result = segment
  for (const { match, canonical } of PROPER_NOUNS) {
    result = result.replace(match, canonical)
  }
  return result
}
