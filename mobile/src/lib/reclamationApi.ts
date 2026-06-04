import { apiFetch } from './api'
import type { Reclamation, ReclamationInput, ReclamationStatut } from '../types/reclamation'

export async function fetchReclamations(
  token: string,
  params?: { q?: string; statut?: ReclamationStatut }
): Promise<Reclamation[]> {
  const list = await apiFetch<Reclamation[]>('/reclamations', {
    token,
    params: { q: params?.q, statut: params?.statut },
  })
  return Array.isArray(list) ? list : []
}

export async function fetchReclamation(token: string, id: number): Promise<Reclamation> {
  return apiFetch<Reclamation>(`/reclamations/${id}`, { token })
}

export async function createReclamation(
  token: string,
  data: ReclamationInput
): Promise<Reclamation> {
  return apiFetch<Reclamation>('/reclamations', { method: 'POST', token, body: data })
}

export async function updateReclamation(
  token: string,
  id: number,
  data: Partial<ReclamationInput>
): Promise<Reclamation> {
  return apiFetch<Reclamation>(`/reclamations/${id}`, { method: 'PUT', token, body: data })
}

export async function deleteReclamation(token: string, id: number): Promise<void> {
  await apiFetch<void>(`/reclamations/${id}`, { method: 'DELETE', token })
}
