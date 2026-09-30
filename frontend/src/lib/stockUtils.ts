import type { ProduitStock } from '@/types'

/** Coût d’achat unitaire TTC (stock à l’instant t). */
export function prixUnitaireAchatTTC(p: ProduitStock): number {
  const q = p.quantite ?? 0
  if (q > 0) return (p.valeurAchatTTC ?? 0) / q
  return (p.dernierPrixUnitaireTTC ?? 0) || (p.prixVente ?? 0)
}

/** Affichage liste stock : coût unitaire ; si stock nul, dernier coût mémorisé (sans confondre avec prix de vente). */
export function prixUnitaireStockAffiche(p: ProduitStock): number {
  const q = p.quantite ?? 0
  if (q > 0) return (p.valeurAchatTTC ?? 0) / q
  return p.dernierPrixUnitaireTTC ?? 0
}
