import type { HistoriqueEtat, Vehicule } from './vehicule'

export type VehiculeStats = {
  total: number
  enCours: number
  byEtat: Record<string, number>
  terminesCeMois: number
}

export type DashboardSummary = {
  problemsCount: number
  urgents: Vehicule[]
  anciens: Vehicule[]
  recentActivity: Array<HistoriqueEtat & { vehicleModel?: string }>
  teamLoadByTechnicien: Record<string, number>
}
