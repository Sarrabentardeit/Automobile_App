export type FactureStatut =
  | 'brouillon'
  | 'envoyee'
  | 'partiellement_payee'
  | 'payee'
  | 'annulee'

export type ModePaiement = 'especes' | 'virement' | 'cheque' | 'carte' | 'autre'

export type FacturePaiement = {
  id: number
  date: string
  montant: number
  mode?: string
  note?: string
  createdAt: string
}

export type LigneFacture =
  | { type: 'main_oeuvre'; designation: string; qte: number; mtHT: number }
  | { type: 'pieces'; designation: string; qte: number; mtHT: number }
  | { type: 'autre_produit'; designation: string; qte: number; mtHT: number }
  | { type: 'divers'; designation: string; qte: number; mtHT: number }
  | { type: 'depense'; designation: string; montant: number }
  | { type: 'produit'; productId: number; designation: string; qte: number; prixUnitaireHT: number }

export type FactureVente = {
  id: number
  numero: string
  date: string
  statut: FactureStatut
  clientId?: number
  clientNom: string
  clientTelephone: string
  clientAdresse?: string
  clientMatriculeFiscale?: string
  montantPaye?: number
  paiements?: FacturePaiement[]
  lignes: LigneFacture[]
  timbre: number
  createdAt: string
}

export const FACTURE_STATUT_LABELS: Record<FactureStatut, string> = {
  brouillon: 'Brouillon',
  envoyee: 'Non payée',
  partiellement_payee: 'Partiellement payée',
  payee: 'Payée',
  annulee: 'Annulée',
}

export const MODE_PAIEMENT_OPTIONS: { value: ModePaiement; label: string }[] = [
  { value: 'especes', label: 'Espèces' },
  { value: 'virement', label: 'Virement' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'carte', label: 'Carte bancaire' },
  { value: 'autre', label: 'Autre' },
]

export const FACTURE_STATUTS: FactureStatut[] = [
  'brouillon',
  'envoyee',
  'partiellement_payee',
  'payee',
  'annulee',
]
