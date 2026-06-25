import { apiFetch } from './api'
import type { Fournisseur, FournisseurInput } from '../types/fournisseur'

export async function fetchFournisseurs(
  token: string,
  params?: { q?: string }
): Promise<Fournisseur[]> {
  const list = await apiFetch<Fournisseur[]>('/fournisseurs', {
    token,
    params: { q: params?.q },
  })
  return Array.isArray(list) ? list : []
}

export async function createFournisseur(
  token: string,
  data: FournisseurInput
): Promise<Fournisseur> {
  return apiFetch<Fournisseur>('/fournisseurs', {
    method: 'POST',
    token,
    body: data,
  })
}

export async function updateFournisseur(
  token: string,
  id: number,
  data: FournisseurInput
): Promise<Fournisseur> {
  return apiFetch<Fournisseur>(`/fournisseurs/${id}`, {
    method: 'PUT',
    token,
    body: data,
  })
}

export async function deleteFournisseur(token: string, id: number): Promise<void> {
  await apiFetch<void>(`/fournisseurs/${id}`, { method: 'DELETE', token })
}
