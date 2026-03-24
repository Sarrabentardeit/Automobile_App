import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { TransactionFournisseur } from '@/types'

const STORAGE_KEY = 'elmecano-transactions-fournisseurs'

function loadFromStorage(): TransactionFournisseur[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function saveToStorage(data: TransactionFournisseur[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

interface TransactionsFournisseursContextValue {
  transactions: TransactionFournisseur[]
  addTransaction: (t: Omit<TransactionFournisseur, 'id'>) => void
  updateTransaction: (id: number, t: Partial<TransactionFournisseur>) => void
  removeTransaction: (id: number) => void
}

const TransactionsFournisseursContext = createContext<TransactionsFournisseursContextValue | null>(null)

export function TransactionsFournisseursProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<TransactionFournisseur[]>(loadFromStorage)

  useEffect(() => {
    saveToStorage(transactions)
  }, [transactions])

  const addTransaction = useCallback((t: Omit<TransactionFournisseur, 'id'>) => {
    setTransactions(prev => {
      const nextId = Math.max(0, ...prev.map(x => x.id)) + 1
      return [...prev, { ...t, id: nextId }]
    })
  }, [])

  const updateTransaction = useCallback((id: number, t: Partial<TransactionFournisseur>) => {
    setTransactions(prev => prev.map(x => (x.id === id ? { ...x, ...t } : x)))
  }, [])

  const removeTransaction = useCallback((id: number) => {
    setTransactions(prev => prev.filter(x => x.id !== id))
  }, [])

  return (
    <TransactionsFournisseursContext.Provider value={{ transactions, addTransaction, updateTransaction, removeTransaction }}>
      {children}
    </TransactionsFournisseursContext.Provider>
  )
}

export function useTransactionsFournisseurs() {
  const ctx = useContext(TransactionsFournisseursContext)
  if (!ctx) throw new Error('useTransactionsFournisseurs must be used within TransactionsFournisseursProvider')
  return ctx
}
