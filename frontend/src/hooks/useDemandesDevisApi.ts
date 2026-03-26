import { useState, useCallback, useEffect } from 'react'
import type { DemandeDevis } from '@/types'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export function useDemandesDevisApi() {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [demandes, setDemandes] = useState<DemandeDevis[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDemandes = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setDemandes([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const list = await apiFetch<DemandeDevis[]>('/demandes-devis', { token })
      setDemandes(Array.isArray(list) ? list : [])
    } catch {
      setDemandes([])
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    if (isAuthenticated) fetchDemandes()
  }, [isAuthenticated, fetchDemandes])

  const addDemande = useCallback(
    async (d: Omit<DemandeDevis, 'id'>): Promise<DemandeDevis> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const created = await apiFetch<DemandeDevis>('/demandes-devis', {
        method: 'POST',
        token,
        body: JSON.stringify({
          date: d.date,
          clientName: d.clientName,
          clientTelephone: d.clientTelephone,
          vehicleRef: d.vehicleRef,
          description: d.description,
          statut: d.statut,
          montantEstime: d.montantEstime,
          dateLimite: d.dateLimite,
          notes: d.notes,
        }),
      })
      setDemandes(prev => [...prev, created])
      return created
    },
    [getAccessToken]
  )

  const updateDemande = useCallback(
    async (id: number, patch: Partial<DemandeDevis>): Promise<DemandeDevis> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const updated = await apiFetch<DemandeDevis>(`/demandes-devis/${id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          date: patch.date,
          clientName: patch.clientName,
          clientTelephone: patch.clientTelephone,
          vehicleRef: patch.vehicleRef,
          description: patch.description,
          statut: patch.statut,
          montantEstime: patch.montantEstime,
          dateLimite: patch.dateLimite,
          notes: patch.notes,
        }),
      })
      setDemandes(prev => prev.map(x => (x.id === id ? updated : x)))
      return updated
    },
    [getAccessToken]
  )

  const removeDemande = useCallback(
    async (id: number): Promise<boolean> => {
      const token = getAccessToken()
      if (!token) return false
      try {
        await apiFetch(`/demandes-devis/${id}`, { method: 'DELETE', token })
        setDemandes(prev => prev.filter(x => x.id !== id))
        return true
      } catch {
        return false
      }
    },
    [getAccessToken]
  )

  return {
    demandes,
    loading,
    fetchDemandes,
    addDemande,
    updateDemande,
    removeDemande,
  }
}

