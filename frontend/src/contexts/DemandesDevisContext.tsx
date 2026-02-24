import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { DemandeDevis } from '@/types'
import { mockDemandesDevis } from '@/data/mock'

const STORAGE_KEY = 'elmecano-demandes-devis'

function loadFromStorage(): DemandeDevis[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return mockDemandesDevis
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : mockDemandesDevis
  } catch {
    return mockDemandesDevis
  }
}

function saveToStorage(data: DemandeDevis[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

interface DemandesDevisContextValue {
  demandes: DemandeDevis[]
  addDemande: (d: Omit<DemandeDevis, 'id'>) => void
  updateDemande: (id: number, d: Partial<DemandeDevis>) => void
  removeDemande: (id: number) => void
}

const Context = createContext<DemandesDevisContextValue | null>(null)

export function DemandesDevisProvider({ children }: { children: ReactNode }) {
  const [demandes, setDemandes] = useState<DemandeDevis[]>(loadFromStorage)
  useEffect(() => { saveToStorage(demandes) }, [demandes])
  const addDemande = useCallback((d: Omit<DemandeDevis, 'id'>) => {
    setDemandes(prev => [...prev, { ...d, id: Math.max(0, ...prev.map(x => x.id)) + 1 }])
  }, [])
  const updateDemande = useCallback((id: number, d: Partial<DemandeDevis>) => {
    setDemandes(prev => prev.map(x => (x.id === id ? { ...x, ...d } : x)))
  }, [])
  const removeDemande = useCallback((id: number) => {
    setDemandes(prev => prev.filter(x => x.id !== id))
  }, [])
  return (
    <Context.Provider value={{ demandes, addDemande, updateDemande, removeDemande }}>
      {children}
    </Context.Provider>
  )
}

export function useDemandesDevis() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useDemandesDevis must be used within DemandesDevisProvider')
  return ctx
}
