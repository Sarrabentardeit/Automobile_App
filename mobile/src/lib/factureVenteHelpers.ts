import { theme } from '../theme/appTheme'
import type { FactureStatut, LigneFacture } from '../types/factureVente'
import { computeFactureTotals } from './factureUtils'

export const STATUT_COLORS: Record<
  FactureStatut,
  { bg: string; border: string; text: string; dot: string }
> = {
  brouillon: {
    bg: theme.surfaceMuted,
    border: theme.border,
    text: theme.textMuted,
    dot: theme.textSubtle,
  },
  envoyee: {
    bg: theme.primarySoft,
    border: '#fed7aa',
    text: theme.primaryDark,
    dot: theme.primary,
  },
  partiellement_payee: {
    bg: '#ffedd5',
    border: '#fdba74',
    text: '#c2410c',
    dot: '#fb923c',
  },
  payee: {
    bg: theme.successSoft,
    border: '#bbf7d0',
    text: '#15803d',
    dot: theme.success,
  },
  annulee: {
    bg: theme.dangerSoft,
    border: '#fecaca',
    text: '#b91c1c',
    dot: theme.danger,
  },
}

export function round2(n: number) {
  return Math.round(n * 100) / 100
}

export function factureTotalTTC(lignes: LigneFacture[], timbre: number) {
  return computeFactureTotals(lignes, timbre ?? 1).totalTTC
}

export function factureResteTTC(f: { lignes: LigneFacture[]; timbre: number; montantPaye?: number }) {
  const total = factureTotalTTC(f.lignes, f.timbre)
  const paye = f.montantPaye ?? 0
  return Math.max(0, round2(total - paye))
}

export function ligneLabel(type: LigneFacture['type']): string {
  switch (type) {
    case 'main_oeuvre':
      return 'Main d\'œuvre'
    case 'pieces':
      return 'Pièces'
    case 'autre_produit':
      return 'Autre produit'
    case 'divers':
      return 'Divers'
    case 'depense':
      return 'Dépense'
    case 'produit':
      return 'Produit stock'
    default:
      return type
  }
}

export function ligneMontantHT(l: LigneFacture): number {
  if (l.type === 'depense') return l.montant
  if (l.type === 'produit') return l.qte * l.prixUnitaireHT
  return l.qte * l.mtHT
}
