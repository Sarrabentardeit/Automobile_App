import { apiUrl } from './config'
import type { BrandFoldersResponse, VehiculeFilteredCounts } from './vehiculeFilters'
import type { Vehicule } from '../types/vehicule'

export type AuthBridge = {
  refresh: () => Promise<string | null>
  onSessionExpired: () => void
}

let authBridge: AuthBridge | null = null

export function setAuthBridge(bridge: AuthBridge | null): void {
  authBridge = bridge
}

export type LoginResponse = {
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

export async function apiFetch<T>(
  path: string,
  options: {
    method?: string
    token?: string
    body?: unknown
    params?: Record<string, string | number | undefined>
    _retry?: boolean
  } = {}
): Promise<T> {
  const { method = 'GET', token, body, params, _retry } = options
  let url = apiUrl(path)
  if (params) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') qs.set(k, String(v))
    }
    const s = qs.toString()
    if (s) url += `?${s}`
  }
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))

  if (res.status === 401 && token && authBridge && !_retry) {
    const newToken = await authBridge.refresh()
    if (newToken) {
      return apiFetch<T>(path, { ...options, token: newToken, _retry: true })
    }
    authBridge.onSessionExpired()
  }

  if (!res.ok) {
    const msg = (data as { error?: string }).error ?? `Erreur ${res.status}`
    throw new Error(msg)
  }
  return data as T
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email: email.trim().toLowerCase(), password },
  })
}

export type VehiculesListResponse = {
  data: Vehicule[]
  total: number
  page: number
  limit: number
}

export async function fetchVehicules(
  token: string,
  params: {
    page?: number
    limit?: number
    q?: string
    type?: 'voiture' | 'moto'
    exclude_etat?: string
    etat?: string
    technicien_id?: number
    date_debut?: string
    date_fin?: string
    marque?: string
  }
): Promise<VehiculesListResponse> {
  return apiFetch<VehiculesListResponse>('/vehicules', { token, params })
}

export async function fetchVehiculeBrands(
  token: string,
  params: {
    type?: 'voiture' | 'moto'
    exclude_etat?: string
    etat?: string
    technicien_id?: number
    date_debut?: string
    date_fin?: string
    q?: string
  }
): Promise<BrandFoldersResponse> {
  return apiFetch<BrandFoldersResponse>('/vehicules/brands', { token, params })
}

export async function fetchVehiculeCounts(
  token: string,
  params: {
    type?: 'voiture' | 'moto'
    exclude_etat?: string
    etat?: string
    technicien_id?: number
    date_debut?: string
    date_fin?: string
    q?: string
    includeEtat?: boolean
  }
): Promise<VehiculeFilteredCounts> {
  return apiFetch<VehiculeFilteredCounts>('/vehicules/counts', {
    token,
    params: {
      ...params,
      includeEtat: params.includeEtat !== false ? 'true' : 'false',
    },
  })
}

export async function fetchVehicule(token: string, id: number): Promise<Vehicule> {
  return apiFetch<Vehicule>(`/vehicules/${id}`, { token })
}
