import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { MoneyIn, MoneyOut } from '@/types'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

interface MoneyContextValue {
  ins: MoneyIn[]
  outs: MoneyOut[]
  loading: boolean
  addIn: (m: Omit<MoneyIn, 'id'>) => Promise<MoneyIn>
  updateIn: (id: number, m: Partial<MoneyIn>) => Promise<MoneyIn>
  removeIn: (id: number) => Promise<boolean>
  addOut: (m: Omit<MoneyOut, 'id'>) => Promise<MoneyOut>
  updateOut: (id: number, m: Partial<MoneyOut>) => Promise<MoneyOut>
  removeOut: (id: number) => Promise<boolean>
}

const Context = createContext<MoneyContextValue | null>(null)

export function MoneyProvider({ children }: { children: ReactNode }) {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [ins, setIns] = useState<MoneyIn[]>([])
  const [outs, setOuts] = useState<MoneyOut[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMoney = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setIns([])
      setOuts([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [insData, outsData] = await Promise.all([
        apiFetch<MoneyIn[]>('/money/in', { token }),
        apiFetch<MoneyOut[]>('/money/out', { token }),
      ])
      setIns(Array.isArray(insData) ? insData : [])
      setOuts(Array.isArray(outsData) ? outsData : [])
    } catch {
      setIns([])
      setOuts([])
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    if (isAuthenticated) fetchMoney()
    else {
      setIns([])
      setOuts([])
      setLoading(false)
    }
  }, [isAuthenticated, fetchMoney])

  const addIn = useCallback(async (m: Omit<MoneyIn, 'id'>): Promise<MoneyIn> => {
    const token = getAccessToken()
    if (!token) throw new Error('Non authentifié')
    const created = await apiFetch<MoneyIn>('/money/in', {
      method: 'POST',
      token,
      body: JSON.stringify(m),
    })
    setIns(prev => [created, ...prev])
    return created
  }, [getAccessToken])

  const updateIn = useCallback(async (id: number, m: Partial<MoneyIn>): Promise<MoneyIn> => {
    const token = getAccessToken()
    if (!token) throw new Error('Non authentifié')
    const updated = await apiFetch<MoneyIn>(`/money/in/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(m),
    })
    setIns(prev => prev.map(x => (x.id === id ? updated : x)))
    return updated
  }, [getAccessToken])

  const removeIn = useCallback(async (id: number): Promise<boolean> => {
    const token = getAccessToken()
    if (!token) return false
    try {
      await apiFetch(`/money/in/${id}`, { method: 'DELETE', token })
      setIns(prev => prev.filter(x => x.id !== id))
      return true
    } catch {
      return false
    }
  }, [getAccessToken])

  const addOut = useCallback(async (m: Omit<MoneyOut, 'id'>): Promise<MoneyOut> => {
    const token = getAccessToken()
    if (!token) throw new Error('Non authentifié')
    const created = await apiFetch<MoneyOut>('/money/out', {
      method: 'POST',
      token,
      body: JSON.stringify(m),
    })
    setOuts(prev => [created, ...prev])
    return created
  }, [getAccessToken])

  const updateOut = useCallback(async (id: number, m: Partial<MoneyOut>): Promise<MoneyOut> => {
    const token = getAccessToken()
    if (!token) throw new Error('Non authentifié')
    const updated = await apiFetch<MoneyOut>(`/money/out/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(m),
    })
    setOuts(prev => prev.map(x => (x.id === id ? updated : x)))
    return updated
  }, [getAccessToken])

  const removeOut = useCallback(async (id: number): Promise<boolean> => {
    const token = getAccessToken()
    if (!token) return false
    try {
      await apiFetch(`/money/out/${id}`, { method: 'DELETE', token })
      setOuts(prev => prev.filter(x => x.id !== id))
      return true
    } catch {
      return false
    }
  }, [getAccessToken])

  return (
    <Context.Provider value={{ ins, outs, loading, addIn, updateIn, removeIn, addOut, updateOut, removeOut }}>
      {children}
    </Context.Provider>
  )
}

export function useMoney() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useMoney must be used within MoneyProvider')
  return ctx
}
