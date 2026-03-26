import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { MouvementProduit, ProduitStock, MouvementStock } from '@/types'
import { useStockGeneral as useStockGeneralHook } from '@/hooks/useStockGeneral'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

interface StockGeneralContextValue {
  mouvements: MouvementProduit[]
  produits: ProduitStock[]
  mouvementsStock: MouvementStock[]
  loading: boolean
  addMouvement: (m: Omit<MouvementProduit, 'id'>) => Promise<MouvementProduit>
  updateMouvement: (id: number, m: Partial<MouvementProduit>) => Promise<MouvementProduit>
  removeMouvement: (id: number) => Promise<boolean>
  addProduit: (p: Omit<ProduitStock, 'id'>) => Promise<ProduitStock>
  updateProduit: (id: number, p: Partial<ProduitStock>) => Promise<ProduitStock>
  removeProduit: (id: number) => Promise<void>
  decrementerStock: (produitId: number, quantite: number, opts?: { origine: 'facture'; reference?: string }) => Promise<boolean>
  incrementerStock: (produitId: number, quantite: number, opts?: { origine: 'achat'; reference?: string; valeurAjout?: number }) => Promise<void>
  refetch: () => void
}

const Context = createContext<StockGeneralContextValue | null>(null)

export function StockGeneralProvider({ children }: { children: ReactNode }) {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [mouvements, setMouvements] = useState<MouvementProduit[]>([])
  const api = useStockGeneralHook()

  const fetchMouvements = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setMouvements([])
      return
    }
    try {
      const list = await apiFetch<MouvementProduit[]>('/stock/mouvements-manuel', { token })
      setMouvements(Array.isArray(list) ? list : [])
    } catch {
      setMouvements([])
    }
  }, [getAccessToken])

  useEffect(() => {
    if (isAuthenticated) void fetchMouvements()
    else setMouvements([])
  }, [isAuthenticated, fetchMouvements])

  const addMouvement = useCallback(async (m: Omit<MouvementProduit, 'id'>): Promise<MouvementProduit> => {
    const token = getAccessToken()
    if (!token) throw new Error('Non authentifié')
    const created = await apiFetch<MouvementProduit>('/stock/mouvements-manuel', {
      method: 'POST',
      token,
      body: JSON.stringify(m),
    })
    setMouvements(prev => [created, ...prev])
    return created
  }, [getAccessToken])
  const updateMouvement = useCallback(async (id: number, m: Partial<MouvementProduit>): Promise<MouvementProduit> => {
    const token = getAccessToken()
    if (!token) throw new Error('Non authentifié')
    const updated = await apiFetch<MouvementProduit>(`/stock/mouvements-manuel/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(m),
    })
    setMouvements(prev => prev.map(x => (x.id === id ? updated : x)))
    return updated
  }, [getAccessToken])
  const removeMouvement = useCallback(async (id: number): Promise<boolean> => {
    const token = getAccessToken()
    if (!token) return false
    try {
      await apiFetch(`/stock/mouvements-manuel/${id}`, { method: 'DELETE', token })
      setMouvements(prev => prev.filter(x => x.id !== id))
      return true
    } catch {
      return false
    }
  }, [getAccessToken])

  return (
    <Context.Provider
      value={{
        mouvements,
        produits: api.produits,
        mouvementsStock: api.mouvementsStock,
        loading: api.loading,
        addMouvement,
        updateMouvement,
        removeMouvement,
        addProduit: api.addProduit,
        updateProduit: api.updateProduit,
        removeProduit: api.removeProduit,
        decrementerStock: api.decrementerStock,
        incrementerStock: api.incrementerStock,
        refetch: api.refetch,
      }}
    >
      {children}
    </Context.Provider>
  )
}

export function useStockGeneral() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useStockGeneral must be used within StockGeneralProvider')
  return ctx
}
