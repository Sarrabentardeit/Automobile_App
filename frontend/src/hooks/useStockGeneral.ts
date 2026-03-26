import { useState, useCallback, useEffect } from 'react'
import type { ProduitStock, MouvementStock } from '@/types'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export function useStockGeneral() {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [produits, setProduits] = useState<ProduitStock[]>([])
  const [mouvementsStock, setMouvementsStock] = useState<MouvementStock[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProduits = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setProduits([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const list = await apiFetch<ProduitStock[]>('/stock/produits', { token })
      setProduits(Array.isArray(list) ? list : [])
    } catch {
      setProduits([])
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  const fetchMouvements = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return
    try {
      const list = await apiFetch<MouvementStock[]>('/stock/mouvements', { token, params: { limit: 100 } })
      setMouvementsStock(Array.isArray(list) ? list : [])
    } catch {
      setMouvementsStock([])
    }
  }, [getAccessToken])

  useEffect(() => {
    if (isAuthenticated) fetchProduits()
  }, [isAuthenticated, fetchProduits])

  useEffect(() => {
    if (isAuthenticated) fetchMouvements()
  }, [isAuthenticated, fetchMouvements])

  const addProduit = useCallback(
    async (p: Omit<ProduitStock, 'id'>): Promise<ProduitStock> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const created = await apiFetch<ProduitStock>('/stock/produits', {
        method: 'POST',
        token,
        body: JSON.stringify({
          nom: p.nom,
          quantite: p.quantite ?? 0,
          valeurAchatTTC: p.valeurAchatTTC ?? 0,
          categorie: p.categorie ?? '',
          prixVente: p.prixVente,
        }),
      })
      setProduits(prev => [...prev, created])
      return created
    },
    [getAccessToken]
  )

  const updateProduit = useCallback(
    async (id: number, p: Partial<ProduitStock>): Promise<ProduitStock> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const updated = await apiFetch<ProduitStock>(`/stock/produits/${id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify(p),
      })
      setProduits(prev => prev.map(x => (x.id === id ? updated : x)))
      return updated
    },
    [getAccessToken]
  )

  const removeProduit = useCallback(
    async (id: number): Promise<void> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      await apiFetch(`/stock/produits/${id}`, { method: 'DELETE', token })
      setProduits(prev => prev.filter(x => x.id !== id))
      setMouvementsStock(prev => prev.filter(m => m.productId !== id))
    },
    [getAccessToken]
  )

  const incrementerStock = useCallback(
    async (produitId: number, quantite: number, opts?: { origine?: 'achat'; reference?: string; valeurAjout?: number }): Promise<void> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const updated = await apiFetch<ProduitStock>(`/stock/produits/${produitId}/increment`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          quantite,
          origine: opts?.origine ?? 'achat',
          reference: opts?.reference,
          valeurAjout: opts?.valeurAjout ?? 0,
        }),
      })
      setProduits(prev => prev.map(x => (x.id === produitId ? updated : x)))
      const p = produits.find(x => x.id === produitId)
      setMouvementsStock(prev => [
        ...prev,
        {
          id: Date.now(),
          date: new Date().toISOString().slice(0, 10),
          productId: produitId,
          produitNom: p?.nom ?? 'Produit',
          quantite,
          type: 'entree',
          origine: 'achat',
          reference: opts?.reference,
        },
      ])
    },
    [getAccessToken, produits]
  )

  const decrementerStock = useCallback(
    async (produitId: number, quantite: number, opts?: { origine?: 'facture'; reference?: string }): Promise<boolean> => {
      const token = getAccessToken()
      if (!token) return false
      const p = produits.find(x => x.id === produitId)
      if (!p || (p.quantite ?? 0) < quantite) return false
      try {
        const updated = await apiFetch<ProduitStock>(`/stock/produits/${produitId}/decrement`, {
          method: 'POST',
          token,
          body: JSON.stringify({
            quantite,
            origine: opts?.origine ?? 'facture',
            reference: opts?.reference,
          }),
        })
        setProduits(prev => prev.map(x => (x.id === produitId ? updated : x)))
        setMouvementsStock(prev => [
          ...prev,
          {
            id: Date.now(),
            date: new Date().toISOString().slice(0, 10),
            productId: produitId,
            produitNom: p.nom,
            quantite,
            type: 'sortie',
            origine: 'facture',
            reference: opts?.reference,
          },
        ])
        return true
      } catch {
        return false
      }
    },
    [getAccessToken, produits]
  )

  const refetch = useCallback(() => {
    fetchProduits()
    fetchMouvements()
  }, [fetchProduits, fetchMouvements])

  return {
    produits,
    mouvementsStock,
    loading,
    addProduit,
    updateProduit,
    removeProduit,
    incrementerStock,
    decrementerStock,
    refetch,
  }
}
