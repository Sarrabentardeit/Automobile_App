import { apiFetch } from './api'
import type { MouvementStock } from '../types/mouvementStock'

export async function fetchMouvementsStock(
  token: string,
  limit = 100
): Promise<MouvementStock[]> {
  const list = await apiFetch<MouvementStock[]>('/stock/mouvements', {
    token,
    params: { limit },
  })
  return Array.isArray(list) ? list : []
}
