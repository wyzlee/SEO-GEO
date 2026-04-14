'use client'

type TokenGetter = () => Promise<string | null>

let tokenGetter: TokenGetter | null = null

export function setTokenGetter(getter: TokenGetter) {
  tokenGetter = getter
}

export interface AuthFetchOptions extends RequestInit {
  orgId?: string
  skipAuth?: boolean
}

export async function authFetch(
  input: RequestInfo | URL,
  options: AuthFetchOptions = {},
): Promise<Response> {
  const { orgId, skipAuth, headers, ...rest } = options

  const finalHeaders = new Headers(headers)
  if (!skipAuth && tokenGetter) {
    const token = await tokenGetter()
    if (token) finalHeaders.set('Authorization', `Bearer ${token}`)
  }
  if (orgId) finalHeaders.set('x-org-id', orgId)
  if (!finalHeaders.has('Content-Type') && rest.body) {
    finalHeaders.set('Content-Type', 'application/json')
  }

  return fetch(input, { ...rest, headers: finalHeaders })
}

export async function apiJson<T>(
  input: RequestInfo | URL,
  options: AuthFetchOptions = {},
): Promise<T> {
  const res = await authFetch(input, options)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(
      `Request failed (${res.status}): ${body.slice(0, 500) || res.statusText}`,
    )
  }
  return (await res.json()) as T
}
