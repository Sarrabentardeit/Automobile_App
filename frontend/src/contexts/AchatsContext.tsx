import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { FactureFournisseur } from '@/types'

const STORAGE_KEY = 'elmecano-achats'

function loadFromStorage(): FactureFournisseur[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveToStorage(data: FactureFournisseur[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

interface AchatsContextValue {
  factures: FactureFournisseur[]
  addFacture: (f: Omit<FactureFournisseur, 'id' | 'createdAt'>) => void
  updateFacture: (id: number, f: Partial<FactureFournisseur>) => void
  removeFacture: (id: number) => void
  getNextNumero: () => string
}

const Context = createContext<AchatsContextValue | null>(null)

export function AchatsProvider({ children }: { children: ReactNode }) {
  const [factures, setFactures] = useState<FactureFournisseur[]>(loadFromStorage)

  useEffect(() => {
    saveToStorage(factures)
  }, [factures])

  const getNextNumero = useCallback(() => {
    const year = new Date().getFullYear().toString().slice(-2)
    const sameYear = factures.filter(f => f.numero.startsWith('A' + year + '-'))
    const max = sameYear.reduce((acc, f) => {
      const num = parseInt(f.numero.split('-')[1] || '0', 10)
      return Math.max(acc, num)
    }, 0)
    return `A${year}-${String(max + 1).padStart(4, '0')}`
  }, [factures])

  const addFacture = useCallback((f: Omit<FactureFournisseur, 'id' | 'createdAt'>) => {
    setFactures(prev => [
      ...prev,
      {
        ...f,
        id: Math.max(0, ...prev.map(x => x.id)) + 1,
        createdAt: new Date().toISOString(),
      },
    ])
  }, [])

  const updateFacture = useCallback((id: number, f: Partial<FactureFournisseur>) => {
    setFactures(prev => prev.map(x => (x.id === id ? { ...x, ...f } : x)))
  }, [])

  const removeFacture = useCallback((id: number) => {
    setFactures(prev => prev.filter(x => x.id !== id))
  }, [])

  return (
    <Context.Provider value={{ factures, addFacture, updateFacture, removeFacture, getNextNumero }}>
      {children}
    </Context.Provider>
  )
}

export function useAchats() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useAchats must be used within AchatsProvider')
  return ctx
}
