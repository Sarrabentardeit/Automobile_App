import { apiFetch, fetchVehiculeCounts } from './api'
import type { VehiculeFilteredCounts } from './vehiculeFilters'
import type { DashboardSummary, VehiculeStats } from '../types/dashboard'

export function fetchVehiculeStats(
  token: string,
  params?: { month?: number; year?: number }
): Promise<VehiculeStats> {
  return apiFetch<VehiculeStats>('/vehicules/stats', { token, params })
}

export function fetchDashboardSummary(
  token: string,
  technicienId?: number
): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>('/vehicules/dashboard-summary', {
    token,
    params: technicienId ? { technicien_id: technicienId } : undefined,
  })
}

export function fetchDashboardCounts(
  token: string,
  technicienId?: number
): Promise<VehiculeFilteredCounts> {
  return fetchVehiculeCounts(token, {
    technicien_id: technicienId,
    includeEtat: true,
  })
}
