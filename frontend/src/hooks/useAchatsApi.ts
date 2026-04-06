import { useState, useCallback, useEffect } from 'react'
import type { FactureFournisseur, FactureFournisseurStatut } from '@/types'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export function useAchatsApi() {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [factures, setFactures] = useState<FactureFournisseur[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAchats = useCallback(
    async (q?: string, statut?: FactureFournisseurStatut) => {
      const token = getAccessToken()
      if (!token) {
        setFactures([])
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const params: Record<string, string | undefined> = {}
        if (q?.trim()) params.q = q.trim()
        if (statut) params.statut = statut

        const list = await apiFetch<FactureFournisseur[]>('/achats', {
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
    if (isAuthenticated) fetchAchats()
  }, [isAuthenticated, fetchAchats])

  const getNextNumero = useCallback(async (): Promise<string> => {
    const token = getAccessToken()
    if (!token) {
      const year = new Date().getFullYear().toString().slice(-2)
      return `A${year}-0001`
    }
    try {
      const res = await apiFetch<{ numero: string }>('/achats/next-numero', { token })
      return res.numero ?? `A${new Date().getFullYear().toString().slice(-2)}-0001`
    } catch {
      const year = new Date().getFullYear().toString().slice(-2)
      const sameYear = factures.filter(f => f.numero.startsWith('A' + year + '-'))
      const max = sameYear.reduce((acc, f) => {
        const num = parseInt(f.numero.split('-')[1] || '0', 10)
        return Math.max(acc, num)
      }, 0)
      return `A${year}-${String(max + 1).padStart(4, '0')}`
    }
  }, [getAccessToken, factures])

  const addFacture = useCallback(
    async (f: Omit<FactureFournisseur, 'id' | 'createdAt'>): Promise<FactureFournisseur> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const created = await apiFetch<FactureFournisseur>('/achats', {
        method: 'POST',
        token,
        body: JSON.stringify({
          numero: f.numero,
          date: f.date,
          fournisseurId: f.fournisseurId,
          fournisseurNom: f.fournisseurNom,
          numeroFactureFournisseur: f.numeroFactureFournisseur,
          modePaiement: f.modePaiement,
          commentaire: f.commentaire,
          timbre: f.timbre ?? 1,
          statut: f.statut,
          paye: f.paye,
          lignes: f.lignes,
        }),
      })
      setFactures(prev => [created, ...prev])
      return created
    },
    [getAccessToken]
  )

  const updateFacture = useCallback(
    async (id: number, patch: Partial<FactureFournisseur>): Promise<FactureFournisseur> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const updated = await apiFetch<FactureFournisseur>(`/achats/${id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify(patch),
      })
      setFactures(prev => prev.map(x => (x.id === id ? updated : x)))
      return updated
    },
    [getAccessToken]
  )

  const removeFacture = useCallback(
    async (id: number): Promise<boolean> => {
      const token = getAccessToken()
      if (!token) return false
      try {
        await apiFetch(`/achats/${id}`, { method: 'DELETE', token })
        setFactures(prev => prev.filter(x => x.id !== id))
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
    fetchAchats,
    addFacture,
    updateFacture,
    removeFacture,
    getNextNumero,
  }
}
