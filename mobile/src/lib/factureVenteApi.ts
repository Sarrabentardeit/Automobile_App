import { apiFetch } from './api'
import { fetchProduits } from './produitApi'
import type { FactureStatut, FactureVente, ModePaiement } from '../types/factureVente'

export type FacturesVenteParams = {
  q?: string
  statut?: string
  year?: number
  month?: number
}

export async function fetchFacturesVente(
  token: string,
  params?: FacturesVenteParams
): Promise<FactureVente[]> {
  const list = await apiFetch<FactureVente[]>('/factures', {
    token,
    params: {
      q: params?.q,
      statut: params?.statut,
      year: params?.year,
      month: params?.month,
    },
  })
  return Array.isArray(list) ? list : []
}

export async function fetchFactureVente(token: string, id: number): Promise<FactureVente> {
  return apiFetch<FactureVente>(`/factures/${id}`, { token })
}

export async function updateFactureStatut(
  token: string,
  id: number,
  statut: FactureStatut
): Promise<FactureVente> {
  return apiFetch<FactureVente>(`/factures/${id}`, {
    method: 'PUT',
    token,
    body: { statut },
  })
}

export async function addPaiementFacture(
  token: string,
  id: number,
  data: { date: string; montant: number; mode?: ModePaiement | ''; note?: string }
): Promise<FactureVente> {
  return apiFetch<FactureVente>(`/factures/${id}/paiements`, {
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

async function decrementStockForFacture(
  token: string,
  facture: FactureVente
): Promise<{ ok: true } | { ok: false; message: string }> {
  const lignesProduit = facture.lignes.filter(
    (l): l is Extract<typeof l, { type: 'produit' }> => l.type === 'produit'
  )
  if (lignesProduit.length === 0) return { ok: true }

  const produits = await fetchProduits(token)
  for (const l of lignesProduit) {
    const p = produits.find((x) => x.id === l.productId)
    if (!p || (p.quantite ?? 0) < l.qte) {
      const nom = p?.nom ?? l.designation ?? 'Produit'
      return { ok: false, message: `Stock insuffisant pour « ${nom} » (demandé : ${l.qte})` }
    }
  }

  for (const l of lignesProduit) {
    await apiFetch(`/stock/produits/${l.productId}/decrement`, {
      method: 'POST',
      token,
      body: {
        quantite: l.qte,
        origine: 'facture',
        reference: facture.numero,
      },
    })
  }
  return { ok: true }
}

/** Validation brouillon → envoyée ou payée (décrémente le stock comme sur le web). */
export async function validateFactureFromBrouillon(
  token: string,
  facture: FactureVente,
  newStatut: 'envoyee' | 'payee'
): Promise<FactureVente> {
  if (facture.statut !== 'brouillon') {
    throw new Error('Action réservée aux factures brouillon')
  }
  const stock = await decrementStockForFacture(token, facture)
  if (!stock.ok) throw new Error(stock.message)
  return updateFactureStatut(token, facture.id, newStatut)
}
