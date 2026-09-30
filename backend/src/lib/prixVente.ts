const TVA = 1.19

export function roundMoney(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** Coût HT de l'article : coût moyen du stock, sinon le dernier coût reçu. */
export function coutUnitaireHt(p: {
  quantite: number
  valeur_achat_ttc: number
  dernier_prix_unitaire_ttc?: number | null
  prix_achat_unitaire?: number | null
}): number {
  const q = Number(p.quantite) || 0
  const ttc =
    q > 0
      ? (Number(p.valeur_achat_ttc) || 0) / q
      : Number(p.dernier_prix_unitaire_ttc) || 0
  if (ttc > 0) return roundMoney(ttc / TVA)
  const saisi = Number(p.prix_achat_unitaire)
  return Number.isFinite(saisi) && saisi > 0 ? roundMoney(saisi) : 0
}

/** Prix de vente = coût × (1 + marge %). null si la marge n'est pas définie. */
export function prixVenteDepuisMarge(coutHt: number, margePct: number | null | undefined): number | null {
  if (margePct == null || !Number.isFinite(Number(margePct)) || coutHt <= 0) return null
  return roundMoney(coutHt * (1 + Number(margePct) / 100))
}
