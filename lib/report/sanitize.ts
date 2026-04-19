/**
 * Sanitiseur HTML léger pour les rapports d'audit.
 *
 * Remplace isomorphic-dompurify (jsdom → @exodus/bytes ESM-only, incompatible
 * Vercel CJS). Le HTML des rapports est généré par generate.ts avec escapeHtml()
 * sur toutes les entrées user — ce sanitiseur est une défense en profondeur.
 *
 * Retire : <script>, handlers on*, URLs javascript:/vbscript:
 * Conserve : tout le reste (styles, links, structure, inline CSS)
 */

function stripScripts(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
}

function stripEventHandlers(html: string): string {
  // on* attrs avec valeur entre guillemets simples ou doubles
  let out = html.replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
  out = out.replace(/\son\w+\s*=\s*'[^']*'/gi, '')
  // on* attrs sans guillemets (valeur jusqu'au prochain espace ou >)
  out = out.replace(/\son\w+\s*=\s*[^\s>]*/gi, '')
  return out
}

function stripDangerousUrls(html: string): string {
  // javascript: et vbscript: dans href/src/action
  return html.replace(
    /((?:href|src|action)\s*=\s*['"])\s*(?:javascript|vbscript)\s*:[^'"]*(['"])/gi,
    '$1#$2',
  )
}

export function sanitizeReportHtml(html: string): string {
  let clean = html
  clean = stripScripts(clean)
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
