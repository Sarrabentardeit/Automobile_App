import type { ProduitStock } from '../types/produitStock'

/** Seuil « à commander » (aligné web Stock Général). */
export const SEUIL_STOCK_FAIBLE = 3

export function prixUnitaireStockAffiche(p: ProduitStock): number {
  const q = p.quantite ?? 0
  if (q > 0) return (p.valeurAchatTTC ?? 0) / q
  return p.dernierPrixUnitaireTTC ?? 0
}

export function isStockEpuise(p: ProduitStock): boolean {
  return (p.quantite ?? 0) === 0
}

export function isStockFaible(p: ProduitStock): boolean {
  const q = p.quantite ?? 0
  return q > 0 && q <= SEUIL_STOCK_FAIBLE
}

export function expectedRevenusFromProduits(produits: ProduitStock[]): number {
  return produits.reduce((sum, p) => {
    const qte = p.quantite ?? 0
    const pv = p.prixVente ?? 0
    if (qte <= 0 || pv <= 0) return sum
    return sum + qte * pv
  }, 0)
}

export function valeurStockTotal(produits: ProduitStock[]): number {
  return produits.reduce((sum, p) => sum + (p.valeurAchatTTC ?? 0), 0)
}
