export type FactureAchatStatut = 'brouillon' | 'validee' | 'partiellement_payee' | 'payee'

export type ModePaiement = 'especes' | 'virement' | 'cheque' | 'carte' | 'autre'

export type FactureAchatPaiement = {
  id: number
  date: string
  montant: number
  mode?: string
  note?: string
  createdAt: string
}

export type LigneAchat = {
  productId?: number | null
  type?: 'produit' | 'service'
  designation: string
  quantite: number
  prixUnitaire: number
}

export type FactureAchat = {
  id: number
  numero: string
  date: string
  fournisseurId: number | null
  fournisseurNom: string
  numeroFactureFournisseur?: string
  modePaiement?: string
  commentaire?: string
  timbre?: number
  statut: FactureAchatStatut
  montantPaye?: number
  paiements?: FactureAchatPaiement[]
  lignes: LigneAchat[]
  paye: boolean
  createdAt: string
}

export const FACTURE_ACHAT_STATUT_LABELS: Record<FactureAchatStatut, string> = {
  brouillon: 'Brouillon',
  validee: 'Validée',
  partiellement_payee: 'Partiellement payée',
  payee: 'Payée',
}

export const MODE_PAIEMENT_OPTIONS: { value: ModePaiement; label: string }[] = [
  { value: 'especes', label: 'Espèces' },
  { value: 'virement', label: 'Virement' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'carte', label: 'Carte bancaire' },
  { value: 'autre', label: 'Autre' },
]

export const FACTURE_ACHAT_STATUTS: FactureAchatStatut[] = [
  'brouillon',
  'validee',
  'partiellement_payee',
  'payee',
]
