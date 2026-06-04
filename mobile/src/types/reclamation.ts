export type ReclamationStatut = 'ouverte' | 'en_cours' | 'traitee' | 'cloturee'
export type ReclamationPriorite = 'basse' | 'normale' | 'haute'

export type Reclamation = {
  id: number
  date: string
  clientName: string
  clientTelephone?: string
  vehicleRef: string
  sujet: string
  description: string
  statut: ReclamationStatut
  assigneA?: string
  priorite?: ReclamationPriorite
  techniciens?: string[]
}

export type ReclamationInput = Omit<Reclamation, 'id'>

export const RECLAMATION_STATUTS: ReclamationStatut[] = [
  'ouverte',
  'en_cours',
  'traitee',
  'cloturee',
]

export const RECLAMATION_STATUT_LABELS: Record<ReclamationStatut, string> = {
  ouverte: 'Ouverte',
  en_cours: 'En cours',
  traitee: 'Traitée',
  cloturee: 'Clôturée',
}

export const RECLAMATION_PRIORITE_LABELS: Record<ReclamationPriorite, string> = {
  basse: 'Basse',
  normale: 'Normale',
  haute: 'Haute',
}

export const STATUT_COLORS: Record<
  ReclamationStatut,
  { bg: string; text: string; border: string }
> = {
  ouverte: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  en_cours: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  traitee: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  cloturee: { bg: '#f3f4f6', text: '#4b5563', border: '#e5e7eb' },
}
