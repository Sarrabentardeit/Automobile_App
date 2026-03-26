import { useState, useCallback, useEffect } from 'react'
import type { Reclamation } from '@/types'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export function useReclamationsApi() {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [reclamations, setReclamations] = useState<Reclamation[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReclamations = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setReclamations([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const list = await apiFetch<Reclamation[]>('/reclamations', { token })
      setReclamations(Array.isArray(list) ? list : [])
    } catch {
      setReclamations([])
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    if (isAuthenticated) fetchReclamations()
  }, [isAuthenticated, fetchReclamations])

  const addReclamation = useCallback(
    async (r: Omit<Reclamation, 'id'>): Promise<Reclamation> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const created = await apiFetch<Reclamation>('/reclamations', {
        method: 'POST',
        token,
        body: JSON.stringify({
          date: r.date,
          clientName: r.clientName,
          clientTelephone: r.clientTelephone,
          vehicleRef: r.vehicleRef,
          sujet: r.sujet,
          description: r.description,
          statut: r.statut,
          assigneA: r.assigneA,
          priorite: r.priorite,
          techniciens: r.techniciens,
        }),
      })
      setReclamations(prev => [...prev, created])
      return created
    },
    [getAccessToken]
  )

  const updateReclamation = useCallback(
    async (id: number, patch: Partial<Reclamation>): Promise<Reclamation> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const updated = await apiFetch<Reclamation>(`/reclamations/${id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          date: patch.date,
          clientName: patch.clientName,
          clientTelephone: patch.clientTelephone,
          vehicleRef: patch.vehicleRef,
          sujet: patch.sujet,
          description: patch.description,
          statut: patch.statut,
          assigneA: patch.assigneA,
          priorite: patch.priorite,
          techniciens: patch.techniciens,
        }),
      })
      setReclamations(prev => prev.map(x => (x.id === id ? updated : x)))
      return updated
    },
    [getAccessToken]
  )

  const removeReclamation = useCallback(
    async (id: number): Promise<boolean> => {
      const token = getAccessToken()
      if (!token) return false
      try {
        await apiFetch(`/reclamations/${id}`, { method: 'DELETE', token })
        setReclamations(prev => prev.filter(x => x.id !== id))
        return true
      } catch {
        return false
      }
    },
    [getAccessToken]
  )

  return {
    reclamations,
    loading,
    fetchReclamations,
    addReclamation,
    updateReclamation,
    removeReclamation,
  }
}
