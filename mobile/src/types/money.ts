export interface MoneyIn {
  id: number
  date: string
  amount: number
  type: string
  description: string
  paymentMethod?: string
}

export interface MoneyOut {
  id: number
  date: string
  amount: number
  category: string
  description: string
  beneficiary?: string
  sourceRef?: string
}

export const MONEY_IN_TYPES = [
  'DIAG', 'MECA', 'PROG', 'PIECES', 'PRODUIT', 'AVANCE',
  'pieces garage', 'cours', 'consultation', 'TVA ET TIMBRE',
  'DIAG ACHAT', 'YASSINE', 'BENEFICE PIECES', 'AUTRE',
] as const

export const MONEY_OUT_CATEGORIES = [
  'GARAGE', 'DEPENSE VOITURE', 'FOURNISSEUR', 'AUTRE',
] as const

export const MONEY_PAYMENT_METHODS = ['ESPECE', 'CHEQUE', 'VIREMENT'] as const

export type TransactionFournisseurType = 'achat' | 'revenue' | 'paiement'

export interface TransactionFournisseur {
  id: number
  type: TransactionFournisseurType
  date: string
  montant: number
  fournisseur: string
  vehicule?: string
  pieces?: string
  numFacture?: string
}
