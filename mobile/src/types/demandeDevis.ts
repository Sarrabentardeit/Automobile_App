export type DemandeDevisStatut = 'en_attente' | 'envoye' | 'accepte' | 'refuse'

export type DemandeDevis = {
  id: number
  date: string
  clientName: string
  clientTelephone?: string
  vehicleRef: string
  description: string
  statut: DemandeDevisStatut
  montantEstime?: number
  dateLimite?: string
  notes?: string
}

export type DemandeDevisInput = Omit<DemandeDevis, 'id'>

export const DEMANDE_DEVIS_STATUTS: DemandeDevisStatut[] = [
  'en_attente',
  'envoye',
  'accepte',
  'refuse',
]

export const DEMANDE_DEVIS_STATUT_LABELS: Record<DemandeDevisStatut, string> = {
  en_attente: 'En attente',
  envoye: 'Envoyé',
  accepte: 'Accepté',
  refuse: 'Refusé',
}
