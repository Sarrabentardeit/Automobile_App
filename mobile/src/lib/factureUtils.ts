import type { FactureAchatKpi, FactureVenteKpi, LigneFactureKpi } from '../types/financeKpi'

export function computeFactureTotals(lignes: LigneFactureKpi[], timbre: number) {
  const htMainOeuvre = lignes
    .filter(
      (l): l is LigneFactureKpi & { mtHT: number; qte: number } =>
        l.type === 'main_oeuvre' ||
        l.type === 'pieces' ||
        l.type === 'autre_produit' ||
        l.type === 'divers'
    )
    .reduce((s, l) => s + (l.qte ?? 0) * (l.mtHT ?? 0), 0)
  const htProduits = lignes
    .filter((l): l is LigneFactureKpi & { prixUnitaireHT: number; qte: number } => l.type === 'produit')
    .reduce((s, l) => s + (l.qte ?? 0) * (l.prixUnitaireHT ?? 0), 0)
  const totalHT = htMainOeuvre + htProduits
  const depenses = lignes
    .filter((l): l is LigneFactureKpi & { montant: number } => l.type === 'depense')
    .reduce((s, l) => s + (l.montant ?? 0), 0)
  const tva19 = totalHT * 0.19
  const totalTTC = totalHT + tva19 + depenses + timbre
  return { totalTTC }
}

export function computeFactureAchatTotals(
  lignes: { quantite: number; prixUnitaire: number }[],
  timbre: number
) {
  const totalHT = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0)
  const tva19 = totalHT * 0.19
  const totalTTC = totalHT + tva19 + timbre
  return { totalHT, tva19, depenses: 0, totalTTC }
}

export function totalAchatGlobalFromFactures(factures: FactureAchatKpi[]): number {
  return factures.reduce(
    (sum, f) => sum + computeFactureAchatTotals(f.lignes, f.timbre ?? 1).totalTTC,
    0
  )
}

export function totalVenduGlobalFromFactures(factures: FactureVenteKpi[]): number {
  return factures.reduce((sum, f) => {
    if (f.statut === 'annulee') return sum
    return sum + computeFactureTotals(f.lignes, f.timbre ?? 1).totalTTC
  }, 0)
}
