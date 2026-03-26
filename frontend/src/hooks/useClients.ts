import { useState, useCallback, useEffect } from 'react'
import type { Client } from '@/types'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export interface ClientsFilters {
  q?: string
  page?: number
  limit?: number
}

export interface ClientStats {
  total: number
}

export function useClients() {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [stats, setStats] = useState<ClientStats | null>(null)

  const fetchClients = useCallback(
    async (filters?: ClientsFilters) => {
      const token = getAccessToken()
      if (!token) {
        setClients([])
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const params: Record<string, string | number | undefined> = {
          page: filters?.page ?? 1,
          limit: filters?.limit ?? 50,
        }
        if (filters?.q) params.q = filters.q

        const res = await apiFetch<{ data: Client[]; total: number; page: number; limit: number }>('/clients', {
          token,
          params,
        })
        setClients(Array.isArray(res.data) ? res.data : [])
        setTotal(res.total ?? 0)
        setPage(res.page ?? 1)
        setLimit(res.limit ?? 50)
      } catch {
        setClients([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    [getAccessToken]
  )

  const fetchStats = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return
    try {
      const s = await apiFetch<ClientStats>('/clients/stats', { token })
      setStats(s)
    } catch {
      setStats(null)
    }
  }, [getAccessToken])

  useEffect(() => {
    if (isAuthenticated) {
      fetchClients({ page: 1, limit: 50 })
      fetchStats()
    }
  }, [isAuthenticated, fetchClients, fetchStats])

  const addClient = useCallback(
    async (c: Omit<Client, 'id'>): Promise<Client> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const created = await apiFetch<Client>('/clients', {
        method: 'POST',
        token,
        body: JSON.stringify({
          nom: c.nom,
          telephone: c.telephone,
          email: c.email,
          adresse: c.adresse,
          notes: c.notes,
          matriculeFiscale: c.matriculeFiscale,
        }),
      })
      setClients(prev => [created, ...prev])
      setTotal(prev => prev + 1)
      if (stats) setStats(prev => (prev ? { ...prev, total: prev.total + 1 } : null))
      return created
    },
    [getAccessToken, stats]
  )

  const updateClient = useCallback(
    async (id: number, c: Partial<Client>): Promise<Client> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const updated = await apiFetch<Client>(`/clients/${id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify(c),
      })
      setClients(prev => prev.map(x => (x.id === id ? updated : x)))
      return updated
    },
    [getAccessToken]
  )

  const removeClient = useCallback(
    async (id: number): Promise<boolean> => {
      const token = getAccessToken()
      if (!token) return false
      try {
        await apiFetch(`/clients/${id}`, { method: 'DELETE', token })
        setClients(prev => prev.filter(x => x.id !== id))
        setTotal(prev => Math.max(0, prev - 1))
        if (stats) setStats(prev => (prev ? { ...prev, total: Math.max(0, prev.total - 1) } : null))
        return true
      } catch {
        return false
      }
    },
    [getAccessToken, stats]
  )

  const refetch = useCallback(
    (filters?: ClientsFilters) => {
      fetchClients(filters ?? { page, limit })
      fetchStats()
    },
    [fetchClients, fetchStats, page, limit]
  )

  return {
    clients,
    loading,
    total,
    page,
    limit,
    stats,
    fetchClients,
    fetchStats,
    addClient,
    updateClient,
    removeClient,
    refetch,
  }
}
