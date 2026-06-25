import { apiFetch } from './api'
import type { DemandeDevis, DemandeDevisInput, DemandeDevisStatut } from '../types/demandeDevis'

export async function fetchDemandesDevis(
  token: string,
  params?: { q?: string; statut?: DemandeDevisStatut }
): Promise<DemandeDevis[]> {
  const list = await apiFetch<DemandeDevis[]>('/demandes-devis', {
    token,
    params: { q: params?.q, statut: params?.statut },
  })
  return Array.isArray(list) ? list : []
}

export async function createDemandeDevis(
  token: string,
  data: DemandeDevisInput
): Promise<DemandeDevis> {
  return apiFetch<DemandeDevis>('/demandes-devis', {
    method: 'POST',
    token,
    body: data,
  })
}

export async function updateDemandeDevis(
  token: string,
  id: number,
  data: Partial<DemandeDevisInput>
): Promise<DemandeDevis> {
  return apiFetch<DemandeDevis>(`/demandes-devis/${id}`, {
    method: 'PUT',
    token,
    body: data,
  })
}

export async function deleteDemandeDevis(token: string, id: number): Promise<void> {
  await apiFetch<void>(`/demandes-devis/${id}`, { method: 'DELETE', token })
}
