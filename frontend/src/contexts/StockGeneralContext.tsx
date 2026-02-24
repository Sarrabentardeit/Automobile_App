import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { MouvementProduit, ProduitStock } from '@/types'
import { mockMouvementsProduit, mockProduitsStock } from '@/data/mock'

const MOUVEMENTS_KEY = 'elmecano-stock-mouvements'
const PRODUITS_KEY = 'elmecano-stock-produits'

function loadMouvements(): MouvementProduit[] {
  try {
    const raw = localStorage.getItem(MOUVEMENTS_KEY)
    if (!raw) return mockMouvementsProduit
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : mockMouvementsProduit
  } catch {
    return mockMouvementsProduit
  }
}

function loadProduits(): ProduitStock[] {
  try {
    const raw = localStorage.getItem(PRODUITS_KEY)
    if (!raw) return mockProduitsStock
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : mockProduitsStock
  } catch {
    return mockProduitsStock
  }
}

interface StockGeneralContextValue {
  mouvements: MouvementProduit[]
  produits: ProduitStock[]
  addMouvement: (m: Omit<MouvementProduit, 'id'>) => void
  updateMouvement: (id: number, m: Partial<MouvementProduit>) => void
  removeMouvement: (id: number) => void
  addProduit: (p: Omit<ProduitStock, 'id'>) => void
  updateProduit: (id: number, p: Partial<ProduitStock>) => void
  removeProduit: (id: number) => void
}

const Context = createContext<StockGeneralContextValue | null>(null)

export function StockGeneralProvider({ children }: { children: ReactNode }) {
  const [mouvements, setMouvements] = useState<MouvementProduit[]>(loadMouvements)
  const [produits, setProduits] = useState<ProduitStock[]>(loadProduits)
  useEffect(() => { localStorage.setItem(MOUVEMENTS_KEY, JSON.stringify(mouvements)) }, [mouvements])
  useEffect(() => { localStorage.setItem(PRODUITS_KEY, JSON.stringify(produits)) }, [produits])

  const addMouvement = useCallback((m: Omit<MouvementProduit, 'id'>) => {
    setMouvements(prev => [...prev, { ...m, id: Math.max(0, ...prev.map(x => x.id)) + 1 }])
  }, [])
  const updateMouvement = useCallback((id: number, m: Partial<MouvementProduit>) => {
    setMouvements(prev => prev.map(x => (x.id === id ? { ...x, ...m } : x)))
  }, [])
  const removeMouvement = useCallback((id: number) => setMouvements(prev => prev.filter(x => x.id !== id)), [])

  const addProduit = useCallback((p: Omit<ProduitStock, 'id'>) => {
    setProduits(prev => [...prev, { ...p, id: Math.max(0, ...prev.map(x => x.id)) + 1 }])
  }, [])
  const updateProduit = useCallback((id: number, p: Partial<ProduitStock>) => {
    setProduits(prev => prev.map(x => (x.id === id ? { ...x, ...p } : x)))
  }, [])
  const removeProduit = useCallback((id: number) => setProduits(prev => prev.filter(x => x.id !== id)), [])

  return (
    <Context.Provider value={{ mouvements, produits, addMouvement, updateMouvement, removeMouvement, addProduit, updateProduit, removeProduit }}>
      {children}
    </Context.Provider>
  )
}

export function useStockGeneral() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useStockGeneral must be used within StockGeneralProvider')
  return ctx
}
