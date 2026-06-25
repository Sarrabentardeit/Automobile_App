import { apiFetch } from './api'
import type { FactureAchat, FactureAchatStatut, ModePaiement } from '../types/factureAchat'

export type FacturesAchatParams = {
  q?: string
  statut?: string
}

export async function fetchFacturesAchat(
  token: string,
  params?: FacturesAchatParams
): Promise<FactureAchat[]> {
  const list = await apiFetch<FactureAchat[]>('/achats', {
    token,
    params: { q: params?.q, statut: params?.statut },
  })
  return Array.isArray(list) ? list : []
}

export async function fetchFactureAchat(token: string, id: number): Promise<FactureAchat> {
  return apiFetch<FactureAchat>(`/achats/${id}`, { token })
}

export async function updateFactureAchatStatut(
  token: string,
  id: number,
  statut: FactureAchatStatut
): Promise<FactureAchat> {
  return apiFetch<FactureAchat>(`/achats/${id}`, {
    method: 'PUT',
    token,
    body: { statut },
  })
}

export async function addPaiementFactureAchat(
  token: string,
  id: number,
  data: { date: string; montant: number; mode?: ModePaiement | ''; note?: string }
): Promise<FactureAchat> {
  return apiFetch<FactureAchat>(`/achats/${id}/paiements`, {
    method: 'POST',
    token,
    body: {
      date: data.date,
      montant: data.montant,
      mode: data.mode || undefined,
      note: data.note?.trim() || undefined,
    },
  })
}
