import { useState, useCallback, useEffect } from 'react'
import type { HuileProduct } from '@/types'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export function useHuilesApi() {
  const { getAccessToken } = useAuth()
  const [products, setProducts] = useState<HuileProduct[]>([])
  const [loading, setLoading] = useState(true)

  const fetchHuiles = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setProducts([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const list = await apiFetch<HuileProduct[]>('/huiles', { token })
      setProducts(Array.isArray(list) ? list : [])
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    fetchHuiles()
  }, [fetchHuiles])

  const addProduct = useCallback(
    async (p: Omit<HuileProduct, 'id'>): Promise<HuileProduct> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const created = await apiFetch<HuileProduct>('/huiles', {
        method: 'POST',
        token,
        body: JSON.stringify({
          designation: p.designation,
          reference: p.reference,
          type: p.type,
          quantite: p.quantite,
          unite: p.unite,
          seuilAlerte: p.seuilAlerte,
          prix: p.prix,
        }),
      })
      setProducts(prev => [...prev, created])
      return created
    },
    [getAccessToken]
  )

  const updateProduct = useCallback(
    async (id: number, patch: Partial<HuileProduct>): Promise<HuileProduct> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const updated = await apiFetch<HuileProduct>(`/huiles/${id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          designation: patch.designation,
          reference: patch.reference,
          type: patch.type,
          quantite: patch.quantite,
          unite: patch.unite,
          seuilAlerte: patch.seuilAlerte,
          prix: patch.prix,
        }),
      })
      setProducts(prev => prev.map(x => (x.id === id ? updated : x)))
      return updated
    },
    [getAccessToken]
  )

  const removeProduct = useCallback(
    async (id: number): Promise<boolean> => {
      const token = getAccessToken()
      if (!token) return false
      try {
        await apiFetch(`/huiles/${id}`, { method: 'DELETE', token })
        setProducts(prev => prev.filter(x => x.id !== id))
        return true
      } catch {
        return false
      }
    },
    [getAccessToken]
  )

  return {
    products,
    loading,
    fetchHuiles,
    addProduct,
    updateProduct,
    removeProduct,
  }
}
