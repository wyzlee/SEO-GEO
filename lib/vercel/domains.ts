/**
 * Client API Vercel REST pour la gestion des domaines custom.
 * Utilisé pour le white-label Silver : les rapports (/r/[slug]) sont
 * accessibles sur le domaine de l'agence (ex: audits.agence.com).
 *
 * Doc : https://vercel.com/docs/rest-api/endpoints/projects#add-a-domain-to-a-project
 */

const VERCEL_API = 'https://api.vercel.com'
const PROJECT_ID = process.env.VERCEL_PROJECT_ID
const API_TOKEN = process.env.VERCEL_API_TOKEN
const TEAM_ID = process.env.VERCEL_TEAM_ID // optionnel

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

function projectUrl(path: string): string {
  const base = `${VERCEL_API}/v9/projects/${PROJECT_ID}/domains`
  const q = TEAM_ID ? `?teamId=${TEAM_ID}` : ''
  return path ? `${base}/${path}${q}` : `${base}${q}`
}

export interface DomainStatus {
  domain: string
  verified: boolean
  cname?: string // valeur CNAME attendue par Vercel
  error?: string
}

/**
 * Ajoute un domaine custom au projet Vercel.
 * Idempotent : Vercel renvoie 409 si le domaine existe déjà sur ce projet —
 * on traite 409 comme succès implicite.
 */
export async function addDomain(
  domain: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!API_TOKEN || !PROJECT_ID) {
    return { ok: false, error: 'Vercel API not configured' }
  }
  const res = await fetch(projectUrl(''), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ name: domain }),
  })
  if (res.ok || res.status === 409) return { ok: true }
  const json = await res.json().catch(() => ({}))
  return {
    ok: false,
    error:
      (json as { error?: { message?: string } }).error?.message ??
      `HTTP ${res.status}`,
  }
}

/**
 * Supprime un domaine custom du projet Vercel.
 * 404 → considéré OK (déjà supprimé).
 */
export async function removeDomain(domain: string): Promise<{ ok: boolean }> {
  if (!API_TOKEN || !PROJECT_ID) return { ok: false }
  const res = await fetch(projectUrl(encodeURIComponent(domain)), {
    method: 'DELETE',
    headers: headers(),
  })
  return { ok: res.ok || res.status === 404 }
}

/**
 * Retourne le statut de vérification d'un domaine custom.
 * Fournit la valeur CNAME attendue si la vérification est en attente.
 */
export async function getDomainStatus(domain: string): Promise<DomainStatus> {
  if (!API_TOKEN || !PROJECT_ID) {
    return { domain, verified: false, error: 'Vercel API not configured' }
  }
  const res = await fetch(projectUrl(encodeURIComponent(domain)), {
    headers: headers(),
  })
  if (!res.ok) {
    return { domain, verified: false, error: `HTTP ${res.status}` }
  }
  const json = (await res.json()) as {
    verified?: boolean
    verification?: { type: string; domain: string; value: string }[]
  }
  const cnameRecord = json.verification?.find((v) => v.type === 'CNAME')
  return {
    domain,
    verified: json.verified ?? false,
    cname: cnameRecord?.value,
  }
}
