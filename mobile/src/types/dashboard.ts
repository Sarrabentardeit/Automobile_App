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
  teamLoadDetailByTechnicien?: Record<
    string,
    {
      total: number
      byEtat: Record<string, number>
      urgents: number
      vehicules?: Array<{
        id: number
        immatriculation: string
        modele: string
        etat_actuel: string
      }>
    }
  >
}

export type DashboardTodayPeriod = 'day' | 'week' | 'month'

export type DashboardTodayResponse = {
  period: DashboardTodayPeriod
  date: string
  start: string
  end: string
  year: number
  month: number
  items: {
    rdv: { count: number }
    reclamations: { count: number }
    dettes: { count: number; total: number }
    devis: { count: number }
    clients: { count: number }
  }
}
