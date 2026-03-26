import { useState, useCallback, useEffect } from 'react'
import type { Fournisseur, FournisseurTopItem, FournisseurFiche } from '@/types'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export function useFournisseursApi() {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFournisseurs = useCallback(
    async (q?: string) => {
      const token = getAccessToken()
      if (!token) {
        setFournisseurs([])
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const params: Record<string, string> = {}
        if (q?.trim()) params.q = q.trim()
        const list = await apiFetch<Fournisseur[]>('/fournisseurs', {
          token,
          params: Object.keys(params).length ? params : undefined,
        })
        setFournisseurs(Array.isArray(list) ? list : [])
      } catch {
        setFournisseurs([])
      } finally {
        setLoading(false)
      }
    },
    [getAccessToken]
  )

  useEffect(() => {
    if (isAuthenticated) fetchFournisseurs()
  }, [isAuthenticated, fetchFournisseurs])

  const addFournisseur = useCallback(
    async (f: Omit<Fournisseur, 'id'>): Promise<Fournisseur> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const created = await apiFetch<Fournisseur>('/fournisseurs', {
        method: 'POST',
        token,
        body: JSON.stringify({
          nom: f.nom,
          telephone: f.telephone,
          email: f.email,
          adresse: f.adresse,
          contact: f.contact,
          notes: f.notes,
        }),
      })
      setFournisseurs(prev => [...prev, created])
      return created
    },
    [getAccessToken]
  )

  const updateFournisseur = useCallback(
    async (id: number, patch: Partial<Fournisseur>): Promise<Fournisseur> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const updated = await apiFetch<Fournisseur>(`/fournisseurs/${id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          nom: patch.nom,
          telephone: patch.telephone,
          email: patch.email,
          adresse: patch.adresse,
          contact: patch.contact,
          notes: patch.notes,
        }),
      })
      setFournisseurs(prev => prev.map(x => (x.id === id ? updated : x)))
      return updated
    },
    [getAccessToken]
  )

  const removeFournisseur = useCallback(
    async (id: number): Promise<boolean> => {
      const token = getAccessToken()
      if (!token) return false
      try {
        await apiFetch(`/fournisseurs/${id}`, { method: 'DELETE', token })
        setFournisseurs(prev => prev.filter(x => x.id !== id))
        return true
      } catch {
        return false
      }
    },
    [getAccessToken]
  )

  const fetchTopFournisseurs = useCallback(
    async (limit = 5): Promise<FournisseurTopItem[]> => {
      const token = getAccessToken()
      if (!token) return []
      const list = await apiFetch<FournisseurTopItem[]>('/fournisseurs/top', {
        token,
        params: { limit: String(limit) },
      })
      return Array.isArray(list) ? list : []
    },
    [getAccessToken]
  )

  const fetchFournisseurFiche = useCallback(
    async (id: number): Promise<FournisseurFiche | null> => {
      const token = getAccessToken()
      if (!token) return null
      try {
        return await apiFetch<FournisseurFiche>(`/fournisseurs/${id}/fiche`, { token })
      } catch {
        return null
      }
    },
    [getAccessToken]
  )

  return {
    fournisseurs,
    loading,
    fetchFournisseurs,
    addFournisseur,
    updateFournisseur,
    removeFournisseur,
    fetchTopFournisseurs,
    fetchFournisseurFiche,
  }
}

