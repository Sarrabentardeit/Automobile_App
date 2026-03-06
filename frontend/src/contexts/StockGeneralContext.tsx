import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { MouvementProduit, ProduitStock, MouvementStock } from '@/types'
import { mockMouvementsProduit, mockProduitsStock } from '@/data/mock'

const MOUVEMENTS_KEY = 'elmecano-stock-mouvements'
const PRODUITS_KEY = 'elmecano-stock-produits'
const MOUVEMENTS_STOCK_KEY = 'elmecano-stock-mouvements-log'

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

function loadMouvementsStock(): MouvementStock[] {
  try {
    const raw = localStorage.getItem(MOUVEMENTS_STOCK_KEY)
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
  addMouvement: (m: Omit<MouvementProduit, 'id'>) => void
  updateMouvement: (id: number, m: Partial<MouvementProduit>) => void
  removeMouvement: (id: number) => void
  addProduit: (p: Omit<ProduitStock, 'id'>) => void
  updateProduit: (id: number, p: Partial<ProduitStock>) => void
  removeProduit: (id: number) => void
  /** Décrémente le stock d'un produit (ex: vente facturée). Retourne false si stock insuffisant. */
  decrementerStock: (produitId: number, quantite: number, opts?: { origine: 'facture'; reference?: string }) => boolean
  /** Incrémente le stock d'un produit (ex: réception achat). */
  incrementerStock: (produitId: number, quantite: number, opts?: { origine: 'achat'; reference?: string }) => void
}

const Context = createContext<StockGeneralContextValue | null>(null)

export function StockGeneralProvider({ children }: { children: ReactNode }) {
  const [mouvements, setMouvements] = useState<MouvementProduit[]>(loadMouvements)
  const [produits, setProduits] = useState<ProduitStock[]>(loadProduits)
  const [mouvementsStock, setMouvementsStock] = useState<MouvementStock[]>(loadMouvementsStock)
  useEffect(() => { localStorage.setItem(MOUVEMENTS_KEY, JSON.stringify(mouvements)) }, [mouvements])
  useEffect(() => { localStorage.setItem(PRODUITS_KEY, JSON.stringify(produits)) }, [produits])
  useEffect(() => { localStorage.setItem(MOUVEMENTS_STOCK_KEY, JSON.stringify(mouvementsStock)) }, [mouvementsStock])

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

  const addMouvementStock = useCallback((m: Omit<MouvementStock, 'id'>) => {
    setMouvementsStock(prev => [...prev, { ...m, id: Math.max(0, ...prev.map(x => x.id)) + 1 }])
  }, [])

  const decrementerStock = useCallback((produitId: number, quantite: number, opts?: { origine: 'facture'; reference?: string }): boolean => {
    const p = produits.find(x => x.id === produitId)
    if (!p || p.quantite < quantite) return false
    setProduits(prev => prev.map(x => (x.id === produitId ? { ...x, quantite: x.quantite - quantite } : x)))
    addMouvementStock({
      date: new Date().toISOString().slice(0, 10),
      productId: produitId,
      produitNom: p.nom,
      quantite,
      type: 'sortie',
      origine: 'facture',
      reference: opts?.reference,
    })
    return true
  }, [produits, addMouvementStock])

  const incrementerStock = useCallback((produitId: number, quantite: number, opts?: { origine: 'achat'; reference?: string }) => {
    const p = produits.find(x => x.id === produitId)
    const nom = p?.nom ?? 'Produit'
    setProduits(prev => prev.map(x => (x.id === produitId ? { ...x, quantite: x.quantite + quantite } : x)))
    if (opts?.origine === 'achat') {
      addMouvementStock({
        date: new Date().toISOString().slice(0, 10),
        productId: produitId,
        produitNom: nom,
        quantite,
        type: 'entree',
        origine: 'achat',
        reference: opts.reference,
      })
    }
  }, [produits, addMouvementStock])

  return (
    <Context.Provider value={{ mouvements, produits, mouvementsStock, addMouvement, updateMouvement, removeMouvement, addProduit, updateProduit, removeProduit, decrementerStock, incrementerStock }}>
      {children}
    </Context.Provider>
  )
}

export function useStockGeneral() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useStockGeneral must be used within StockGeneralProvider')
  return ctx
}
