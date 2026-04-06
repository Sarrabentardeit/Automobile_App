/** Lignes achat : prix_unitaire = P.U. HT (comme produits facture vente). */

export function totalHTAchatLignes(lignes: { quantite: number; prix_unitaire: number }[]): number {
  return lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0)
}

export function totalTTCAchat(
  lignes: { quantite: number; prix_unitaire: number }[],
  timbre: number
): number {
  const ht = totalHTAchatLignes(lignes)
  const tva = ht * 0.19
  return ht + tva + timbre
}

/** Coût TTC des marchandises pour la valorisation stock (hors timbre fiscal). */
export function valeurLigneStockTTC(quantite: number, prixUnitaireHT: number): number {
  const q = Math.max(0, quantite)
  const pu = Number(prixUnitaireHT) || 0
  return q * pu * 1.19
}
