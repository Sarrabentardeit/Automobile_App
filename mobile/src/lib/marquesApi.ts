import { apiFetch } from './api'
import { mediaUrl } from './vehiculeApi'

export type Marque = {
  id: number
  nom: string
  slug: string
  logoUrl?: string | null
  actif: boolean
}

export function marqueLogoUri(logoUrl?: string | null): string | null {
  if (!logoUrl) return null
  return mediaUrl(logoUrl)
}

export function fetchMarques(token: string, opts?: { all?: boolean }): Promise<Marque[]> {
  return apiFetch<{ data: Marque[] }>('/marques', {
    token,
    params: opts?.all ? { all: '1' } : undefined,
  }).then((r) => r.data ?? [])
}

export function createMarque(
  token: string,
  data: { nom: string; logoDataUrl?: string | null }
): Promise<Marque> {
  return apiFetch<Marque>('/marques', {
    token,
    method: 'POST',
    body: {
      nom: data.nom,
      logoDataUrl: data.logoDataUrl ?? undefined,
    },
  })
}

export function updateMarque(
  token: string,
  id: number,
  data: {
    nom?: string
    actif?: boolean
    logoDataUrl?: string | null
    removeLogo?: boolean
  }
): Promise<Marque> {
  return apiFetch<Marque>(`/marques/${id}`, {
    token,
    method: 'PUT',
    body: data,
  })
}

export function deactivateMarque(token: string, id: number): Promise<Marque> {
  return apiFetch<Marque>(`/marques/${id}`, { method: 'DELETE', token })
}
