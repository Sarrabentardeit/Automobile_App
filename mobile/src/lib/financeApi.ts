import { apiFetch } from './api'
import type { FactureAchatKpi, FactureVenteKpi } from '../types/financeKpi'

export async function fetchFacturesVenteKpi(token: string): Promise<FactureVenteKpi[]> {
  const list = await apiFetch<FactureVenteKpi[]>('/factures', { token })
  return Array.isArray(list) ? list : []
}

export async function fetchFacturesAchatKpi(token: string): Promise<FactureAchatKpi[]> {
  const list = await apiFetch<FactureAchatKpi[]>('/achats', { token })
  return Array.isArray(list) ? list : []
}
