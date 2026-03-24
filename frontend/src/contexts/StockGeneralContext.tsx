import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { MouvementProduit, ProduitStock, MouvementStock } from '@/types'
import { useStockGeneral as useStockGeneralHook } from '@/hooks/useStockGeneral'

const MOUVEMENTS_KEY = 'elmecano-stock-mouvements'

function loadMouvements(): MouvementProduit[] {
  try {
    const raw = localStorage.getItem(MOUVEMENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

interface StockGeneralContextValue {
  mouvements: MouvementProduit[]
  produits: ProduitStock[]
  mouvementsStock: MouvementStock[]
  loading: boolean
  addMouvement: (m: Omit<MouvementProduit, 'id'>) => void
  updateMouvement: (id: number, m: Partial<MouvementProduit>) => void
  removeMouvement: (id: number) => void
  addProduit: (p: Omit<ProduitStock, 'id'>) => Promise<ProduitStock>
  updateProduit: (id: number, p: Partial<ProduitStock>) => Promise<ProduitStock>
  removeProduit: (id: number) => Promise<void>
  decrementerStock: (produitId: number, quantite: number, opts?: { origine: 'facture'; reference?: string }) => Promise<boolean>
  incrementerStock: (produitId: number, quantite: number, opts?: { origine: 'achat'; reference?: string; valeurAjout?: number }) => Promise<void>
  refetch: () => void
}

const Context = createContext<StockGeneralContextValue | null>(null)

export function StockGeneralProvider({ children }: { children: ReactNode }) {
  const [mouvements, setMouvements] = useState<MouvementProduit[]>(loadMouvements)
  const api = useStockGeneralHook()

  useEffect(() => {
    localStorage.setItem(MOUVEMENTS_KEY, JSON.stringify(mouvements))
  }, [mouvements])

  const addMouvement = useCallback((m: Omit<MouvementProduit, 'id'>) => {
    setMouvements(prev => [...prev, { ...m, id: Math.max(0, ...prev.map(x => x.id)) + 1 }])
  }, [])
  const updateMouvement = useCallback((id: number, m: Partial<MouvementProduit>) => {
    setMouvements(prev => prev.map(x => (x.id === id ? { ...x, ...m } : x)))
  }, [])
  const removeMouvement = useCallback((id: number) => {
    setMouvements(prev => prev.filter(x => x.id !== id))
  }, [])

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
