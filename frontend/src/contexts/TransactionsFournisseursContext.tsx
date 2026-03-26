import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { TransactionFournisseur } from '@/types'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

interface TransactionsFournisseursContextValue {
  transactions: TransactionFournisseur[]
  loading: boolean
  addTransaction: (t: Omit<TransactionFournisseur, 'id'>) => Promise<TransactionFournisseur>
  updateTransaction: (id: number, t: Partial<TransactionFournisseur>) => Promise<TransactionFournisseur>
  removeTransaction: (id: number) => Promise<boolean>
}

const TransactionsFournisseursContext = createContext<TransactionsFournisseursContextValue | null>(null)

export function TransactionsFournisseursProvider({ children }: { children: ReactNode }) {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [transactions, setTransactions] = useState<TransactionFournisseur[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTransactions = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setTransactions([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const list = await apiFetch<TransactionFournisseur[]>('/fournisseur-transactions', { token })
      setTransactions(Array.isArray(list) ? list : [])
    } catch {
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    if (isAuthenticated) fetchTransactions()
    else {
      setTransactions([])
      setLoading(false)
    }
  }, [isAuthenticated, fetchTransactions])

  const addTransaction = useCallback(
    async (t: Omit<TransactionFournisseur, 'id'>): Promise<TransactionFournisseur> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const created = await apiFetch<TransactionFournisseur>('/fournisseur-transactions', {
        method: 'POST',
        token,
        body: JSON.stringify(t),
      })
      setTransactions(prev => [...prev, created])
      return created
    },
    [getAccessToken]
  )

  const updateTransaction = useCallback(
    async (id: number, t: Partial<TransactionFournisseur>): Promise<TransactionFournisseur> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const updated = await apiFetch<TransactionFournisseur>(`/fournisseur-transactions/${id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify(t),
      })
      setTransactions(prev => prev.map(x => (x.id === id ? updated : x)))
      return updated
    },
    [getAccessToken]
  )

  const removeTransaction = useCallback(
    async (id: number): Promise<boolean> => {
      const token = getAccessToken()
      if (!token) return false
      try {
        await apiFetch(`/fournisseur-transactions/${id}`, { method: 'DELETE', token })
        setTransactions(prev => prev.filter(x => x.id !== id))
        return true
      } catch {
        return false
      }
    },
    [getAccessToken]
  )

  return (
    <TransactionsFournisseursContext.Provider
      value={{
        transactions,
        loading,
        addTransaction,
        updateTransaction,
        removeTransaction,
      }}
    >
      {children}
    </TransactionsFournisseursContext.Provider>
  )
}
export function useTransactionsFournisseurs() {
  const ctx = useContext(TransactionsFournisseursContext)
  if (!ctx) throw new Error('useTransactionsFournisseurs must be used within TransactionsFournisseursProvider')
  return ctx
}
