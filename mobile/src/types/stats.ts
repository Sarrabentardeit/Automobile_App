import type { MenuRouteId } from '../navigation/menuConfig'
import type { ClientAvecDette } from './clientDette'
import type { VehiculeStats } from './dashboard'

export type StatsTrendPoint = {
  period: string
  caFacture: number
  encaissements: number
  depenses: number
  vehiculesTraites: number
  reclamations: number
  achats: number
  paiementsFournisseurs: number
}

export type StatsTrendGroupBy = 'month' | 'quarter'

export type MoneyInRow = {
  id: number
  date: string
  amount: number
  type: string
  description: string
  paymentMethod?: string
}

export type MoneyOutRow = {
  id: number
  date: string
  amount: number
  category: string
  description: string
  beneficiary?: string
  sourceRef?: string
}

export type FournisseurTransactionRow = {
  id: number
  type: 'achat' | 'revenue' | 'paiement'
  date: string
  montant: number
  fournisseur: string
}

export type GlobalStatCounts = {
  vehicules: number
  clients: number
  equipe: number
  caisseJours: number
  calendar: number
  fournisseurs: number
  transactionsFournisseurs: number
  reclamations: number
  devis: number
  contacts: number
  clientsDettes: number
  stockTotal: number
  outilsAhmed: number
}

export type GlobalStatItem = {
  key: keyof GlobalStatCounts
  label: string
  icon: string
  color: string
  bg: string
  route?: MenuRouteId
}

export type StatsDashboardData = {
  counts: GlobalStatCounts
  vehiculeStats: VehiculeStats
  moneyIns: MoneyInRow[]
  moneyOuts: MoneyOutRow[]
  transactions: FournisseurTransactionRow[]
  clientsDettes: ClientAvecDette[]
}
