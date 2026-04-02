import { useState, useCallback, useEffect } from 'react'
import type {
  Vehicule,
  VehiculeFormData,
  HistoriqueEtat,
  EtatVehicule,
  VehiculeImage,
  VehiculeImageUploadInput,
} from '@/types'
import { TRANSITIONS_AUTORISEES } from '@/types'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export interface VehiculesFilters {
  type?: 'voiture' | 'moto'
  etat?: EtatVehicule
  technicien_id?: number
  date_debut?: string
  date_fin?: string
  q?: string
  page?: number
  limit?: number
}

export interface VehiculeStats {
  total: number
  enCours: number
  byEtat: Record<string, number>
  terminesCeMois: number
}

export interface VehiculeFilteredCounts {
  total: number
  byEtat: Record<string, number>
}

export interface DashboardSummary {
  problemsCount: number
  urgents: Vehicule[]
  anciens: Vehicule[]
  recentActivity: Array<HistoriqueEtat & { vehicleModel?: string }>
  teamLoadByTechnicien: Record<string, number>
}

export function useVehicules() {
  const { user, getAccessToken } = useAuth()
  const [vehicules, setVehicules] = useState<Vehicule[]>([])
  const [historique, setHistorique] = useState<HistoriqueEtat[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [vehiculeCache, setVehiculeCache] = useState<Record<number, Vehicule>>({})
  const [imagesByVehicule, setImagesByVehicule] = useState<Record<number, VehiculeImage[]>>({})
  const [stats, setStats] = useState<VehiculeStats | null>(null)
  const [filteredCounts, setFilteredCounts] = useState<VehiculeFilteredCounts | null>(null)
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null)

  const fetchVehicules = useCallback(
    async (filters?: VehiculesFilters) => {
      const token = getAccessToken()
      if (!token) {
        setVehicules([])
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const params: Record<string, string | number | undefined> = {
          page: filters?.page ?? 1,
          limit: filters?.limit ?? 20,
        }
        if (filters?.type) params.type = filters.type
        if (filters?.etat) params.etat = filters.etat
        if (filters?.technicien_id) params.technicien_id = filters.technicien_id
        if (filters?.date_debut) params.date_debut = filters.date_debut
        if (filters?.date_fin) params.date_fin = filters.date_fin
        if (filters?.q) params.q = filters.q

        const res = await apiFetch<{ data: Vehicule[]; total: number; page: number; limit: number }>('/vehicules', {
          token,
          params,
        })
        setVehicules(Array.isArray(res.data) ? res.data : [])
        setTotal(res.total ?? 0)
        setPage(res.page ?? 1)
        setLimit(res.limit ?? 20)
      } catch {
        setVehicules([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    [getAccessToken]
  )

  const fetchStats = useCallback(
    async (month?: number, year?: number) => {
      const token = getAccessToken()
      if (!token) return
      try {
        const params: Record<string, number> = {}
        if (month) params.month = month
        if (year) params.year = year
        const s = await apiFetch<VehiculeStats>('/vehicules/stats', { token, params: Object.keys(params).length ? params : undefined })
        setStats(s)
      } catch {
        setStats(null)
      }
    },
    [getAccessToken]
  )

  const fetchDashboardSummary = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return
    try {
      const data = await apiFetch<DashboardSummary>('/vehicules/dashboard-summary', { token })
      setDashboardSummary(data)
    } catch {
      setDashboardSummary(null)
    }
  }, [getAccessToken])

  const fetchFilteredCounts = useCallback(
    async (filters?: VehiculesFilters, includeEtat = false) => {
      const token = getAccessToken()
      if (!token) return
      try {
        const params: Record<string, string | number | undefined> = {
          includeEtat: includeEtat ? 'true' : 'false',
        }
        if (filters?.type) params.type = filters.type
        if (filters?.etat) params.etat = filters.etat
        if (filters?.technicien_id) params.technicien_id = filters.technicien_id
        if (filters?.date_debut) params.date_debut = filters.date_debut
        if (filters?.date_fin) params.date_fin = filters.date_fin
        if (filters?.q) params.q = filters.q
        const data = await apiFetch<VehiculeFilteredCounts>('/vehicules/counts', { token, params })
        setFilteredCounts(data)
      } catch {
        setFilteredCounts(null)
      }
    },
    [getAccessToken]
  )

  const fetchHistorique = useCallback(
    async (ids: number[]) => {
      const token = getAccessToken()
      if (!token || ids.length === 0) return
      const all: HistoriqueEtat[] = []
      for (const id of ids) {
        try {
          const list = await apiFetch<HistoriqueEtat[]>(`/vehicules/${id}/historique`, { token })
          if (Array.isArray(list)) all.push(...list)
        } catch {}
      }
      setHistorique(prev => {
        const byVeh = new Map(prev.map(h => [h.vehicule_id, true]))
        const newOnes = all.filter(h => !byVeh.get(h.vehicule_id))
        return [...prev.filter(h => !ids.includes(h.vehicule_id)), ...all]
      })
    },
    [getAccessToken]
  )

  useEffect(() => {
    const ownOnly = user?.permissions?.vehiculeVisibility === 'own'
    fetchVehicules({
      page: 1,
      limit: 20,
      ...(ownOnly && user ? { technicien_id: user.id } : {}),
    })
    fetchStats()
    fetchDashboardSummary()
  }, [fetchVehicules, fetchStats, fetchDashboardSummary, user])

  useEffect(() => {
    if (vehicules.length > 0) fetchHistorique(vehicules.map(v => v.id))
    else setHistorique([])
  }, [vehicules, fetchHistorique])

  const addVehicule = useCallback(
    async (data: VehiculeFormData, userId: number, userName: string) => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const v = await apiFetch<Vehicule>('/vehicules', {
        method: 'POST',
        token,
        body: JSON.stringify({
          immatriculation: data.immatriculation,
          modele: data.modele,
          type: data.type,
          etat_initial: data.etat_initial,
          date_entree: data.date_entree,
          defaut: data.defaut,
          technicien_id: data.technicien_id,
          responsable_id: data.responsable_id,
          client_telephone: data.client_telephone,
          notes: data.notes,
          service_type: data.service_type,
        }),
      })
      setVehicules(prev => [v, ...prev])
      setTotal(prev => prev + 1)
      fetchDashboardSummary()
      return v
    },
    [getAccessToken, fetchDashboardSummary]
  )

  const editVehicule = useCallback(
    async (id: number, data: Partial<VehiculeFormData>) => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const v = await apiFetch<Vehicule>(`/vehicules/${id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify(data),
      })
      setVehicules(prev => prev.map(x => (x.id === id ? v : x)))
      setVehiculeCache(prev => (prev[id] ? { ...prev, [id]: v } : prev))
      return v
    },
    [getAccessToken]
  )

  const deleteVehicule = useCallback(
    async (id: number): Promise<boolean> => {
      const token = getAccessToken()
      if (!token) return false
      try {
        await apiFetch(`/vehicules/${id}`, { method: 'DELETE', token })
        setVehicules(prev => prev.filter(x => x.id !== id))
        setHistorique(prev => prev.filter(h => h.vehicule_id !== id))
        setTotal(prev => Math.max(0, prev - 1))
        setVehiculeCache(prev => {
          const next = { ...prev }
          delete next[id]
          return next
        })
        return true
      } catch {
        return false
      }
    },
    [getAccessToken]
  )

  const changeEtat = useCallback(
    async (
      vehiculeId: number,
      nouvelEtat: EtatVehicule,
      userId: number,
      userName: string,
      commentaire: string,
      piecesUtilisees: string
    ): Promise<boolean> => {
      const vehicule = vehicules.find(v => v.id === vehiculeId) ?? vehiculeCache[vehiculeId]
      if (!vehicule) return false
      const allowed = TRANSITIONS_AUTORISEES[vehicule.etat_actuel]
      if (!allowed.includes(nouvelEtat)) return false

      const token = getAccessToken()
      if (!token) return false

      try {
        const v = await apiFetch<Vehicule>(`/vehicules/${vehiculeId}/changer-etat`, {
          method: 'POST',
          token,
          body: JSON.stringify({
            nouvel_etat: nouvelEtat,
            commentaire,
            pieces_utilisees: piecesUtilisees,
          }),
        })
        setVehicules(prev => prev.map(x => (x.id === vehiculeId ? v : x)))
        setVehiculeCache(prev => (prev[vehiculeId] ? { ...prev, [vehiculeId]: v } : prev))
        const list = await apiFetch<HistoriqueEtat[]>(`/vehicules/${vehiculeId}/historique`, { token })
        if (Array.isArray(list)) {
          setHistorique(prev => [...prev.filter(h => h.vehicule_id !== vehiculeId), ...list])
        }
        fetchDashboardSummary()
        return true
      } catch {
        return false
      }
    },
    [vehicules, vehiculeCache, getAccessToken, fetchDashboardSummary]
  )

  const getHistorique = useCallback(
    (vehiculeId: number) => {
      return historique
        .filter(h => h.vehicule_id === vehiculeId)
        .sort((a, b) => new Date(a.date_changement).getTime() - new Date(b.date_changement).getTime())
    },
    [historique]
  )

  const getVehicule = useCallback(
    (id: number) => {
      return vehicules.find(v => v.id === id) ?? vehiculeCache[id] ?? null
    },
    [vehicules, vehiculeCache]
  )

  const fetchVehiculeById = useCallback(
    async (id: number): Promise<Vehicule | null> => {
      const token = getAccessToken()
      if (!token) return null
      try {
        const [v, hist] = await Promise.all([
          apiFetch<Vehicule>(`/vehicules/${id}`, { token }),
          apiFetch<HistoriqueEtat[]>(`/vehicules/${id}/historique`, { token }),
        ])
        setVehiculeCache(prev => ({ ...prev, [id]: v }))
        if (Array.isArray(hist)) {
          setHistorique(prev => [...prev.filter(h => h.vehicule_id !== id), ...hist])
        }
        return v
      } catch {
        return null
      }
    },
    [getAccessToken]
  )

  const fetchVehiculeImages = useCallback(
    async (vehiculeId: number): Promise<VehiculeImage[]> => {
      const token = getAccessToken()
      if (!token) return []
      try {
        const images = await apiFetch<VehiculeImage[]>(`/vehicules/${vehiculeId}/images`, { token })
        const normalized = Array.isArray(images) ? images : []
        setImagesByVehicule(prev => ({ ...prev, [vehiculeId]: normalized }))
        return normalized
      } catch {
        setImagesByVehicule(prev => ({ ...prev, [vehiculeId]: [] }))
        return []
      }
    },
    [getAccessToken]
  )

  const uploadVehiculeImage = useCallback(
    async (vehiculeId: number, payload: VehiculeImageUploadInput): Promise<VehiculeImage> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const created = await apiFetch<VehiculeImage>(`/vehicules/${vehiculeId}/images`, {
        method: 'POST',
        token,
        body: JSON.stringify(payload),
      })
      setImagesByVehicule(prev => {
        const current = prev[vehiculeId] ?? []
        return { ...prev, [vehiculeId]: [created, ...current] }
      })
      return created
    },
    [getAccessToken]
  )

  const deleteVehiculeImage = useCallback(
    async (vehiculeId: number, imageId: number): Promise<boolean> => {
      const token = getAccessToken()
      if (!token) return false
      try {
        await apiFetch<void>(`/vehicules/${vehiculeId}/images/${imageId}`, { method: 'DELETE', token })
        setImagesByVehicule(prev => ({
          ...prev,
          [vehiculeId]: (prev[vehiculeId] ?? []).filter(i => i.id !== imageId),
        }))
        return true
      } catch {
        return false
      }
    },
    [getAccessToken]
  )

  const getVehiculeImages = useCallback(
    (vehiculeId: number) => imagesByVehicule[vehiculeId] ?? [],
    [imagesByVehicule]
  )

  const refetch = useCallback(
    (filters?: VehiculesFilters) => {
      fetchVehicules(filters ?? { page, limit })
      fetchStats()
      fetchDashboardSummary()
    },
    [fetchVehicules, fetchStats, fetchDashboardSummary, page, limit]
  )

  return {
    vehicules,
    historique,
    loading,
    total,
    page,
    limit,
    stats,
    fetchStats,
    dashboardSummary,
    fetchDashboardSummary,
    filteredCounts,
    fetchFilteredCounts,
    addVehicule,
    editVehicule,
    deleteVehicule,
    changeEtat,
    getHistorique,
    getVehicule,
    getVehiculeImages,
    fetchVehiculeById,
    fetchVehiculeImages,
    uploadVehiculeImage,
    deleteVehiculeImage,
    fetchVehicules,
    refetch,
  }
}
