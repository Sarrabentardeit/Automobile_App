import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Reclamation } from '@/types'
import { mockReclamations } from '@/data/mock'

const STORAGE_KEY = 'elmecano-reclamations'

function loadFromStorage(): Reclamation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return mockReclamations
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : mockReclamations
  } catch {
    return mockReclamations
  }
}

function saveToStorage(data: Reclamation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

interface ReclamationsContextValue {
  reclamations: Reclamation[]
  addReclamation: (r: Omit<Reclamation, 'id'>) => void
  updateReclamation: (id: number, r: Partial<Reclamation>) => void
  removeReclamation: (id: number) => void
}

const Context = createContext<ReclamationsContextValue | null>(null)

export function ReclamationsProvider({ children }: { children: ReactNode }) {
  const [reclamations, setReclamations] = useState<Reclamation[]>(loadFromStorage)
  useEffect(() => { saveToStorage(reclamations) }, [reclamations])
  const addReclamation = useCallback((r: Omit<Reclamation, 'id'>) => {
    setReclamations(prev => [...prev, { ...r, id: Math.max(0, ...prev.map(x => x.id)) + 1 }])
  }, [])
  const updateReclamation = useCallback((id: number, r: Partial<Reclamation>) => {
    setReclamations(prev => prev.map(x => (x.id === id ? { ...x, ...r } : x)))
  }, [])
  const removeReclamation = useCallback((id: number) => {
    setReclamations(prev => prev.filter(x => x.id !== id))
  }, [])
  return (
    <Context.Provider value={{ reclamations, addReclamation, updateReclamation, removeReclamation }}>
      {children}
    </Context.Provider>
  )
}

export function useReclamations() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useReclamations must be used within ReclamationsProvider')
  return ctx
}
