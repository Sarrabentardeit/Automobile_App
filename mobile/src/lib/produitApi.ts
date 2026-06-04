import { apiFetch } from './api'
import type { ProduitStock, ProduitStockInput } from '../types/produitStock'

export async function fetchProduits(
  token: string,
  params?: { q?: string; categorie?: string; fluidesOnly?: boolean }
): Promise<ProduitStock[]> {
  const list = await apiFetch<ProduitStock[]>('/stock/produits', {
    token,
    params: {
      q: params?.q,
      categorie: params?.categorie,
      fluidesOnly: params?.fluidesOnly ? 1 : undefined,
    },
  })
  return Array.isArray(list) ? list : []
}

export async function fetchProduit(token: string, id: number): Promise<ProduitStock> {
  return apiFetch<ProduitStock>(`/stock/produits/${id}`, { token })
}

export async function createProduit(token: string, data: ProduitStockInput): Promise<ProduitStock> {
  return apiFetch<ProduitStock>('/stock/produits', { method: 'POST', token, body: data })
}

export async function updateProduit(
  token: string,
  id: number,
  data: Partial<ProduitStockInput>
): Promise<ProduitStock> {
  return apiFetch<ProduitStock>(`/stock/produits/${id}`, { method: 'PUT', token, body: data })
}

export async function deleteProduit(token: string, id: number): Promise<void> {
  await apiFetch<void>(`/stock/produits/${id}`, { method: 'DELETE', token })
}
