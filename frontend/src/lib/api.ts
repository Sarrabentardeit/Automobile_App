const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export function getApiUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const base = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  if (!params) return base
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== null) search.set(k, String(v))
  }
  const qs = search.toString()
  return qs ? `${base}?${qs}` : base
}

/** Permet à l'app d'enregistrer le refresh token pour réessayer après 401 */
export interface AuthBridge {
  refresh: () => Promise<string | null>
  onSessionExpired: () => void
}

let authBridge: AuthBridge | null = null

export function setAuthBridge(bridge: AuthBridge | null): void {
  authBridge = bridge
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string; params?: Record<string, string | number | undefined>; _retry?: boolean } = {}
): Promise<T> {
  const { token, params, _retry, ...init } = options
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const url = getApiUrl(path, params)
  const res = await fetch(url, { ...init, headers })
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}))

  if (res.status === 401 && token && authBridge && !_retry) {
    const newToken = await authBridge.refresh()
    if (newToken) {
      return apiFetch<T>(path, { ...options, token: newToken, _retry: true })
    }
    authBridge.onSessionExpired()
  }

  if (!res.ok) {
    throw new Error((data.error as string) ?? `Erreur ${res.status}`)
  }
  return data as T
}

export interface LoginResponse {
  user: {
    id: number
    email: string
    fullName: string
    role: string
    telephone?: string
    permissions?: Record<string, unknown>
  }
  accessToken: string
  refreshToken: string
}

export interface RegisterResponse extends LoginResponse {}

export interface RefreshResponse {
  accessToken: string
  refreshToken: string
}
