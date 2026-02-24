import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { HuileProduct } from '@/types'
import { mockHuileProducts } from '@/data/mock'

const STORAGE_KEY = 'elmecano-huile'

function load(): HuileProduct[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return mockHuileProducts
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : mockHuileProducts
  } catch {
    return mockHuileProducts
  }
}

interface HuileContextValue {
  products: HuileProduct[]
  addProduct: (p: Omit<HuileProduct, 'id'>) => void
  updateProduct: (id: number, p: Partial<HuileProduct>) => void
  removeProduct: (id: number) => void
}

const Ctx = createContext<HuileContextValue | null>(null)

export function HuileProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<HuileProduct[]>(load)
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(products)) }, [products])
  const addProduct = useCallback((p: Omit<HuileProduct, 'id'>) => {
    setProducts(prev => [...prev, { ...p, id: Math.max(0, ...prev.map(x => x.id)) + 1 }])
  }, [])
  const updateProduct = useCallback((id: number, p: Partial<HuileProduct>) => {
    setProducts(prev => prev.map(x => (x.id === id ? { ...x, ...p } : x)))
  }, [])
  const removeProduct = useCallback((id: number) => {
    setProducts(prev => prev.filter(x => x.id !== id))
  }, [])
  return (
    <Ctx.Provider value={{ products, addProduct, updateProduct, removeProduct }}>
      {children}
    </Ctx.Provider>
  )
}

export function useHuile() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useHuile must be used within HuileProvider')
  return ctx
}
