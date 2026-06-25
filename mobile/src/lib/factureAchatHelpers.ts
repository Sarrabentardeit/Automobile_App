import { computeFactureAchatTotals } from './factureUtils'
import { theme } from '../theme/appTheme'
import type { FactureAchatStatut, LigneAchat } from '../types/factureAchat'

export const STATUT_COLORS: Record<
  FactureAchatStatut,
  { bg: string; border: string; text: string; dot: string }
> = {
  brouillon: {
    bg: theme.surfaceMuted,
    border: theme.border,
    text: theme.textMuted,
    dot: theme.textSubtle,
  },
  validee: {
    bg: '#eff6ff',
    border: '#bfdbfe',
    text: '#1d4ed8',
    dot: '#3b82f6',
  },
  partiellement_payee: {
    bg: theme.primarySoft,
    border: '#fed7aa',
    text: theme.primaryDark,
    dot: theme.primary,
  },
  payee: {
    bg: theme.successSoft,
    border: '#bbf7d0',
    text: '#15803d',
    dot: theme.success,
  },
}

export function round2(n: number) {
  return Math.round(n * 100) / 100
}

export function factureAchatTotalTTC(lignes: LigneAchat[], timbre: number) {
  return computeFactureAchatTotals(lignes, timbre ?? 1).totalTTC
}

export function factureAchatResteTTC(f: {
  lignes: LigneAchat[]
  timbre?: number
  montantPaye?: number
}) {
  const total = factureAchatTotalTTC(f.lignes, f.timbre ?? 1)
  const paye = f.montantPaye ?? 0
  return Math.max(0, round2(total - paye))
}

export function ligneAchatMontantHT(l: LigneAchat): number {
  return l.quantite * l.prixUnitaire
}

export function ligneAchatLabel(l: LigneAchat): string {
  return l.type === 'service' ? 'Service' : 'Produit'
}
