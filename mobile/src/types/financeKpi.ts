export type LigneFactureKpi =
  | { type: 'main_oeuvre'; qte: number; mtHT: number }
  | { type: 'pieces'; qte: number; mtHT: number }
  | { type: 'autre_produit'; qte: number; mtHT: number }
  | { type: 'divers'; qte: number; mtHT: number }
  | { type: 'depense'; montant: number }
  | {
      type: 'produit'
      productId?: number
      designation?: string
      qte: number
      prixUnitaireHT: number
    }
  | { type: string; qte?: number; mtHT?: number; montant?: number; prixUnitaireHT?: number; productId?: number; designation?: string }

export type FactureVenteKpi = {
  date?: string
  statut: string
  lignes: LigneFactureKpi[]
  timbre?: number
}

export type LigneAchatKpi = {
  quantite: number
  prixUnitaire: number
}

export type FactureAchatKpi = {
  lignes: LigneAchatKpi[]
  timbre?: number
}
