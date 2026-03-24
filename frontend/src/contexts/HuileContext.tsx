import { createContext, useContext, type ReactNode } from 'react'
import type { HuileProduct } from '@/types'
import { useHuilesApi } from '@/hooks/useHuilesApi'

interface HuileContextValue {
  products: HuileProduct[]
  loading: boolean
  fetchHuiles: () => Promise<void>
  addProduct: (p: Omit<HuileProduct, 'id'>) => Promise<HuileProduct>
  updateProduct: (id: number, p: Partial<HuileProduct>) => Promise<HuileProduct>
  removeProduct: (id: number) => Promise<boolean>
}

const Ctx = createContext<HuileContextValue | null>(null)

export function HuileProvider({ children }: { children: ReactNode }) {
  const api = useHuilesApi()
  return (
    <Ctx.Provider
      value={{
        products: api.products,
        loading: api.loading,
        fetchHuiles: api.fetchHuiles,
        addProduct: api.addProduct,
        updateProduct: api.updateProduct,
        removeProduct: api.removeProduct,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useHuile() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useHuile must be used within HuileProvider')
  return ctx
}
