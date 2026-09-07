import { apiFetch, resolveUploadUrl } from '@/lib/api'

export type Marque = {
  id: number
  nom: string
  slug: string
  logoUrl?: string | null
  actif: boolean
}

export function marqueLogoUrl(logoUrl?: string | null): string {
  return resolveUploadUrl(logoUrl)
}

export function fetchMarques(token: string, opts?: { all?: boolean }) {
  return apiFetch<{ data: Marque[] }>('/marques', {
    token,
    params: opts?.all ? { all: '1' } : undefined,
  }).then(r => r.data ?? [])
}

export function createMarque(
  token: string,
  data: { nom: string; logoDataUrl?: string | null }
) {
  return apiFetch<Marque>('/marques', {
    token,
    method: 'POST',
    body: JSON.stringify({
      nom: data.nom,
      logoDataUrl: data.logoDataUrl ?? undefined,
    }),
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
) {
  return apiFetch<Marque>(`/marques/${id}`, {
    token,
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deactivateMarque(token: string, id: number) {
  return apiFetch<Marque>(`/marques/${id}`, { token, method: 'DELETE' })
}
