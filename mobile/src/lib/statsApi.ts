import { apiFetch } from './api'
import { fetchClientStats } from './clientApi'
import { fetchCalendarAssignments } from './calendarApi'
import { fetchContactsImportants } from './contactImportantApi'
import { fetchClientsDettes } from './clientDetteApi'
import { fetchDemandesDevis } from './demandeDevisApi'
import { fetchFournisseurs } from './fournisseurApi'
import { fetchProduits } from './produitApi'
import { fetchReclamations } from './reclamationApi'
import { fetchMouvementsStock } from './stockApi'
import { fetchTeamMembers } from './teamMemberApi'
import { fetchVehiculeStats } from './dashboardApi'
import type {
  FournisseurTransactionRow,
  GlobalStatCounts,
  MoneyInRow,
  MoneyOutRow,
  StatsDashboardData,
  StatsTrendGroupBy,
  StatsTrendPoint,
} from '../types/stats'
import type { VehiculeStats } from '../types/dashboard'

type TrendsResponse = {
  data: StatsTrendPoint[]
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch {
    return fallback
  }
}

export function fetchStatsTrends(
  token: string,
  params: { year: number; groupBy: StatsTrendGroupBy }
): Promise<StatsTrendPoint[]> {
  return apiFetch<TrendsResponse>('/stats/trends', { token, params }).then((r) =>
    Array.isArray(r.data) ? r.data : []
  )
}

async function fetchMoneyIns(token: string): Promise<MoneyInRow[]> {
  const list = await apiFetch<MoneyInRow[]>('/money/in', { token })
  return Array.isArray(list) ? list : []
}

async function fetchMoneyOuts(token: string): Promise<MoneyOutRow[]> {
  const list = await apiFetch<MoneyOutRow[]>('/money/out', { token })
  return Array.isArray(list) ? list : []
}

async function fetchFournisseurTransactions(token: string): Promise<FournisseurTransactionRow[]> {
  const list = await apiFetch<FournisseurTransactionRow[]>('/fournisseur-transactions', { token })
  return Array.isArray(list) ? list : []
}

async function fetchCaisseDayCount(token: string): Promise<number> {
  const res = await apiFetch<{ data?: unknown[] }>('/caisse', { token })
  return Array.isArray(res.data) ? res.data.length : 0
}

async function fetchOutilsAhmedCount(token: string): Promise<number> {
  const list = await apiFetch<unknown[]>('/outils/ahmed', { token })
  return Array.isArray(list) ? list.length : 0
}

const emptyVehiculeStats = (): VehiculeStats => ({
  total: 0,
  enCours: 0,
  byEtat: {},
  terminesCeMois: 0,
})

export async function fetchStatsDashboard(
  token: string,
  month: number,
  year: number
): Promise<StatsDashboardData> {
  const [
    vehiculeStats,
    clientStats,
    teamMembers,
    caisseJours,
    calendar,
    fournisseurs,
    transactions,
    reclamations,
    devis,
    contacts,
    clientsDettes,
    mouvements,
    produits,
    outilsAhmed,
    moneyIns,
    moneyOuts,
  ] = await Promise.all([
    safe(() => fetchVehiculeStats(token, { month, year }), emptyVehiculeStats()),
    safe(() => fetchClientStats(token), { total: 0 }),
    safe(() => fetchTeamMembers(token), []),
    safe(() => fetchCaisseDayCount(token), 0),
    safe(() => fetchCalendarAssignments(token), []),
    safe(() => fetchFournisseurs(token), []),
    safe(() => fetchFournisseurTransactions(token), []),
    safe(() => fetchReclamations(token), []),
    safe(() => fetchDemandesDevis(token), []),
    safe(() => fetchContactsImportants(token), []),
    safe(() => fetchClientsDettes(token), []),
    safe(() => fetchMouvementsStock(token, 100), []),
    safe(() => fetchProduits(token), []),
    safe(() => fetchOutilsAhmedCount(token), 0),
    safe(() => fetchMoneyIns(token), []),
    safe(() => fetchMoneyOuts(token), []),
  ])

  const counts: GlobalStatCounts = {
    vehicules: vehiculeStats.total,
    clients: clientStats.total,
    equipe: teamMembers.length,
    caisseJours,
    calendar: calendar.length,
    fournisseurs: fournisseurs.length,
    transactionsFournisseurs: transactions.length,
    reclamations: reclamations.length,
    devis: devis.length,
    contacts: contacts.length,
    clientsDettes: clientsDettes.length,
    stockTotal: mouvements.length + produits.length,
    outilsAhmed,
  }

  return {
    counts,
    vehiculeStats,
    moneyIns,
    moneyOuts,
    transactions,
    clientsDettes,
  }
}
