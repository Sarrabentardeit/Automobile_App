import type { DemandeDevisStatut } from '../types/demandeDevis'
import { theme } from '../theme/appTheme'

/** Accent orange EL MECANO (alias thème — compat rechargement HMR). */
export const DEVIS_ACCENT = theme.primary

/** Couleurs sémantiques des statuts (badges / filtres). */
export const STATUT_COLORS: Record<
  DemandeDevisStatut,
  { bg: string; text: string; border: string }
> = {
  en_attente: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  envoye: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  accepte: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  refuse: { bg: '#f3f4f6', text: '#4b5563', border: '#e5e7eb' },
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}
