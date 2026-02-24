import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Fournisseur } from '@/types'
import { mockFournisseurs } from '@/data/mock'

const STORAGE_KEY = 'elmecano-fournisseurs'

function loadFromStorage(): Fournisseur[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return mockFournisseurs
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return mockFournisseurs
    return parsed
  } catch {
    return mockFournisseurs
  }
}

function saveToStorage(data: Fournisseur[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

interface FournisseursContextValue {
  fournisseurs: Fournisseur[]
  addFournisseur: (f: Omit<Fournisseur, 'id'>) => void
  updateFournisseur: (id: number, f: Partial<Fournisseur>) => void
  removeFournisseur: (id: number) => void
}

const FournisseursContext = createContext<FournisseursContextValue | null>(null)

export function FournisseursProvider({ children }: { children: ReactNode }) {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>(loadFromStorage)

  useEffect(() => {
    saveToStorage(fournisseurs)
  }, [fournisseurs])

  const addFournisseur = useCallback((f: Omit<Fournisseur, 'id'>) => {
    setFournisseurs(prev => {
      const nextId = Math.max(0, ...prev.map(x => x.id)) + 1
      return [...prev, { ...f, id: nextId }]
    })
  }, [])

  const updateFournisseur = useCallback((id: number, f: Partial<Fournisseur>) => {
    setFournisseurs(prev => prev.map(x => (x.id === id ? { ...x, ...f } : x)))
  }, [])

  const removeFournisseur = useCallback((id: number) => {
    setFournisseurs(prev => prev.filter(x => x.id !== id))
  }, [])

  return (
    <FournisseursContext.Provider value={{ fournisseurs, addFournisseur, updateFournisseur, removeFournisseur }}>
      {children}
    </FournisseursContext.Provider>
  )
}

export function useFournisseurs() {
  const ctx = useContext(FournisseursContext)
  if (!ctx) throw new Error('useFournisseurs must be used within FournisseursProvider')
  return ctx
}
