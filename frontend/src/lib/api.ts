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

/**
 * URL publique d'un fichier /uploads/... (même host que l'API).
 * Ne pas utiliser `/api${path}` en relatif : en local ça sert souvent le HTML Vite → image cassée.
 */
export function resolveUploadUrl(path: string | null | undefined, cacheBust?: string | number): string {
  if (!path) return ''
  if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  const base = API_BASE.replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  const url = `${base}${p}`
  if (cacheBust == null || cacheBust === '') return url
  return `${url}${url.includes('?') ? '&' : '?'}t=${encodeURIComponent(String(cacheBust))}`
}

/** Télécharge un fichier chat (PDF, etc.) — force le save même si le navigateur prévisualise. */
export async function downloadUploadFile(
  pathOrUrl: string,
  fileName = 'fichier.pdf'
): Promise<void> {
  const url = resolveUploadUrl(pathOrUrl)
  if (!url) throw new Error('Fichier introuvable')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Erreur ${res.status}`)
  const blob = await res.blob()
  const obj = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = obj
  a.download = fileName || 'fichier.pdf'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(obj)
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
    avatarUrl?: string | null
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
