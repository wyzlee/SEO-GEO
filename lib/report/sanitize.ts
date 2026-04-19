/**
 * Sanitiseur HTML léger pour les rapports d'audit.
 *
 * Remplace isomorphic-dompurify (jsdom → @exodus/bytes ESM-only, incompatible
 * Vercel CJS). Le HTML des rapports est généré par generate.ts avec escapeHtml()
 * sur toutes les entrées user — ce sanitiseur est une défense en profondeur.
 *
 * Retire : <script>, handlers on*, URLs javascript:/vbscript:/data:text|app*,
 *          tags dangereux (<iframe>, <object>, <embed>, <form>, <input>),
 *          <meta http-equiv="refresh">
 * Conserve : tout le reste (styles, links, structure, inline CSS)
 */

function stripScripts(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
}

function stripDangerousTags(html: string): string {
  // Tags structurellement dangereux (embedding, forms, meta refresh)
  let out = html.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
  out = out.replace(/<iframe\b[^>]*/gi, '')
  out = out.replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '')
  out = out.replace(/<embed\b[^>]*/gi, '')
  out = out.replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, '')
  out = out.replace(/<input\b[^>]*/gi, '')
  // <meta http-equiv="refresh"> redirect vector
  out = out.replace(/<meta\b[^>]*http-equiv\s*=\s*['"]refresh['"][^>]*/gi, '')
  return out
}

function stripEventHandlers(html: string): string {
  // \b (word boundary) covers both space-before and slash-before (e.g. <svg/onload=...>)
  let out = html.replace(/\bon\w+\s*=\s*"[^"]*"/gi, '')
  out = out.replace(/\bon\w+\s*=\s*'[^']*'/gi, '')
  // on* attrs sans guillemets (valeur jusqu'au prochain espace ou >)
  out = out.replace(/\bon\w+\s*=\s*[^\s>]*/gi, '')
  return out
}

function stripDangerousUrls(html: string): string {
  // javascript: et vbscript: dans href/src/action
  let out = html.replace(
    /((?:href|src|action)\s*=\s*['"])\s*(?:javascript|vbscript)\s*:[^'"]*(['"])/gi,
    '$1#$2',
  )
  // data: URLs non-images (data:text/*, data:application/* etc.)
  out = out.replace(
    /((?:href|src|action)\s*=\s*['"])\s*data:\s*(?!image\/)[^'"]*(['"])/gi,
    '$1#$2',
  )
  return out
}

export function sanitizeReportHtml(html: string): string {
  let clean = html
  clean = stripScripts(clean)
  clean = stripDangerousTags(clean)
  clean = stripEventHandlers(clean)
  clean = stripDangerousUrls(clean)
  return clean
}

/**
 * Sanitize + injecte les meta tags de sécurité dans <head>.
 * Utilisé pour la page publique /r/[slug] et le rendu PDF.
 */
export function sanitizeReportDocument(html: string): string {
  const cleaned = sanitizeReportHtml(html)
  return cleaned.replace(
    /<head>/i,
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">',
  )
}
