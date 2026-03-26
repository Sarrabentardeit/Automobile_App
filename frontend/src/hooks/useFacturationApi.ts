import { useState, useCallback, useEffect } from 'react'
import type { Facture, FactureStatut } from '@/types'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export interface FacturesFilters {
  q?: string
  statut?: FactureStatut
  year?: number
  month?: number
}

export function useFacturationApi() {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [factures, setFactures] = useState<Facture[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFactures = useCallback(
    async (filters?: FacturesFilters) => {
      const token = getAccessToken()
      if (!token) {
        setFactures([])
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const params: Record<string, string | number | undefined> = {}
        if (filters?.q) params.q = filters.q
        if (filters?.statut) params.statut = filters.statut
        if (filters?.year) params.year = filters.year
        if (filters?.month) params.month = filters.month

        const list = await apiFetch<Facture[]>('/factures', {
          token,
          params: Object.keys(params).length ? params : undefined,
        })
        setFactures(Array.isArray(list) ? list : [])
      } catch {
        setFactures([])
      } finally {
        setLoading(false)
      }
    },
    [getAccessToken]
  )

  useEffect(() => {
    if (isAuthenticated) fetchFactures()
  }, [isAuthenticated, fetchFactures])

  const getNextNumero = useCallback(() => {
    const year = new Date().getFullYear().toString().slice(-2)
    const sameYear = factures.filter(f => f.numero.startsWith(year + '-'))
    const max = sameYear.reduce((acc, f) => {
      const num = parseInt(f.numero.split('-')[1] || '0', 10)
      return Math.max(acc, num)
    }, 0)
    return `${year}-${String(max + 1).padStart(4, '0')}`
  }, [factures])

  const addFacture = useCallback(
    async (f: Omit<Facture, 'id' | 'createdAt'>): Promise<Facture> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const created = await apiFetch<Facture>('/factures', {
        method: 'POST',
        token,
        body: JSON.stringify({
          numero: f.numero,
          date: f.date,
          statut: f.statut,
          clientId: f.clientId,
          clientNom: f.clientNom,
          clientTelephone: f.clientTelephone,
          clientAdresse: f.clientAdresse,
          clientMatriculeFiscale: f.clientMatriculeFiscale,
          lignes: f.lignes,
          timbre: f.timbre,
        }),
      })
      setFactures(prev => [...prev, created])
      return created
    },
    [getAccessToken]
  )

  const updateFacture = useCallback(
    async (id: number, patch: Partial<Facture>): Promise<Facture> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const updated = await apiFetch<Facture>(`/factures/${id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify(patch),
      })
      setFactures(prev => prev.map(f => (f.id === id ? updated : f)))
      return updated
    },
    [getAccessToken]
  )

  const removeFacture = useCallback(
    async (id: number): Promise<boolean> => {
      const token = getAccessToken()
      if (!token) return false
      try {
        await apiFetch(`/factures/${id}`, { method: 'DELETE', token })
        setFactures(prev => prev.filter(f => f.id !== id))
        return true
      } catch {
        return false
      }
    },
    [getAccessToken]
  )

  return {
    factures,
    loading,
    fetchFactures,
    addFacture,
    updateFacture,
    removeFacture,
    getNextNumero,
  }
}

