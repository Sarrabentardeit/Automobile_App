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

/** Coût HT de l'article (coût moyen du stock), puis prix saisi s'il n'y a pas encore de réception. */
export function coutArticleHt(p: ProduitStock): number {
  const ttc = prixUnitaireStockAffiche(p)
  if (ttc > 0) return Math.round((ttc / 1.19) * 100) / 100
  return p.prixAchatUnitaire ?? 0
}

/** Prix de vente d'un devis : coût de l'article × (1 + marge). */
export function prixVenteDevis(p: ProduitStock): number {
  const cout = coutArticleHt(p)
  if (p.margeVentePct != null && cout > 0) {
    return Math.round(cout * (1 + p.margeVentePct / 100) * 100) / 100
  }
  if (p.prixVente != null && p.prixVente > 0) return p.prixVente
  return cout
}
