import type { FactureVenteKpi } from '../types/financeKpi'

export type ProduitPlusVendu = {
  productId: number
  nom: string
  qte: number
}

export function currentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function produitsPlusVendusCeMois(
  factures: FactureVenteKpi[] | null,
  ceMois: string
): ProduitPlusVendu[] {
  if (!factures?.length) return []
  const map = new Map<number, { nom: string; qte: number }>()
  for (const f of factures) {
    if (f.statut === 'annulee') continue
    const [y, m] = (f.date ?? '').split('-')
    if (`${y}-${m}` !== ceMois) continue
    for (const l of f.lignes) {
      if (l.type !== 'produit') continue
      const productId = l.productId
      if (productId == null) continue
      const qte = l.qte ?? 0
      const nom = l.designation ?? `Produit #${productId}`
      const cur = map.get(productId)
      if (cur) map.set(productId, { nom, qte: cur.qte + qte })
      else map.set(productId, { nom, qte })
    }
  }
  return [...map.entries()]
    .map(([productId, v]) => ({ productId, ...v }))
    .sort((a, b) => b.qte - a.qte)
    .slice(0, 5)
}
