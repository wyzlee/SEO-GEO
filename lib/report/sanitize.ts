import DOMPurify from 'isomorphic-dompurify'

// DOMPurify strip `rel` sur <link> par défaut car certaines valeurs
// (`import`, `prerender`, `manifest`) peuvent charger des ressources
// hostiles. On réautorise uniquement un ensemble safe pour le design
// du rapport (Google Fonts Inter chargé via stylesheet + preconnect).
const SAFE_LINK_RELS = new Set([
  'stylesheet',
  'preconnect',
  'preload',
  'icon',
  'shortcut icon',
  'dns-prefetch',
])

let _hookInstalled = false
function ensureLinkRelHook(): void {
  if (_hookInstalled) return
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    if (
      data.attrName === 'rel' &&
      (node as Element).tagName === 'LINK' &&
      SAFE_LINK_RELS.has(data.attrValue.toLowerCase())
    ) {
      data.keepAttr = true
    }
  })
  _hookInstalled = true
}

/**
 * Sanitize le HTML d'un rapport d'audit avant de le rendre dans le navigateur
 * (page publique `/r/[slug]` ou conversion PDF).
 *
 * Contrat :
 * - Le HTML du rapport est généré côté serveur via `generateReport()` avec
 *   `escapeHtml()` à chaque frontière user-data, donc en théorie safe.
 * - Cette sanitization est une **défense en profondeur** : toute régression
 *   ou future feature qui laisserait passer du HTML brut (ex. description
 *   Markdown → HTML via un renderer non-escaping) est bloquée ici.
 *
 * Ce qui est conservé :
 * - Structure : html, head, body, doctype, div, section, table, tr/td, etc.
 * - Typographie : h1-h6, p, ul/ol/li, strong, em, code, pre, blockquote
 * - Liens : <a href> — http(s)/mailto seulement (pas de javascript:/data:)
 * - Styles : <style> + attribut `style=` inline (indispensables pour le
 *   design auto-contained du rapport)
 * - Ressources externes : <link rel="stylesheet"> et <link rel="preconnect">
 *   (Google Fonts Inter utilisée par le rapport)
 *
 * Ce qui est retiré :
 * - <script>, <iframe>, <object>, <embed>, <form>, <input>, <button>
 * - Handlers inline (`on*=`, ex `onload`, `onerror`)
 * - URLs `javascript:`, `data:*` (sauf images pas utilisées ici)
 * - Attributs ARIA/data-* non-whitelistés
 */
export function sanitizeReportHtml(html: string): string {
  ensureLinkRelHook()
  return DOMPurify.sanitize(html, {
    // Le rapport est un document HTML complet (<!doctype><html>...).
    WHOLE_DOCUMENT: true,
    // Mode additif : on part du whitelist par défaut de DOMPurify (safe HTML5)
    // et on étend avec <link>/<style> nécessaires au design auto-contained
    // du rapport. Le whitelist par défaut couvre h1-h6, tables, listes,
    // strong/em/code/pre, a (href http/mailto), img, etc.
    ADD_TAGS: ['link', 'style'],
    ADD_ATTR: ['rel', 'href', 'type', 'media', 'crossorigin', 'as'],
    // Note : on N'UTILISE PAS ALLOWED_URI_REGEXP car cette option (même avec
    // un hook uponSanitizeAttribute) strip `rel` sur <link> (DOMPurify le
    // traite comme URI-valued). On laisse le regex URI par défaut qui bloque
    // déjà javascript:, vbscript:, data:* — et on ajoute data:image via
    // ADD_DATA_URI_TAGS pour les logos embarqués.
    ADD_DATA_URI_TAGS: ['img'],
    FORBID_TAGS: [
      'script', 'iframe', 'object', 'embed',
      'form', 'input', 'button', 'textarea', 'select', 'option',
      'base', 'meta',
    ],
    // TODO(security/L2): DOMPurify ne sanitise pas le contenu CSS des balises
    // <style>. Un `url()` dans un bloc <style> peut exfiltrer des données via
    // une requête HTTP sortante. Surface limitée aux admins/consultants pouvant
    // injecter du contenu dans les templates. Fix complet : post-traitement
    // des blocs <style> avec un sanitiseur CSS (ex. strip url() non-data:).
    FORBID_ATTR: [
      'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseenter',
      'onmouseleave', 'onfocus', 'onblur', 'onsubmit', 'onchange',
      'onkeydown', 'onkeyup', 'onkeypress', 'ontoggle', 'onanimationend',
      'onwaiting', 'onplay', 'onpause',
      'formaction', 'srcdoc', 'background',
    ],
  })
}

/**
 * Variante : ré-ajoute `<meta charset="utf-8">` après sanitize car DOMPurify
 * retire tous les <meta>. Sans ça, les caractères accentués peuvent mal
 * s'afficher dans certains navigateurs qui ne détectent pas UTF-8.
 */
export function sanitizeReportDocument(html: string): string {
  const cleaned = sanitizeReportHtml(html)
  return cleaned.replace(
    /<head>/i,
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">',
  )
}
