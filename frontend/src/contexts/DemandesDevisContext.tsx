import { createContext, useContext, type ReactNode } from 'react'
import { useDemandesDevisApi } from '@/hooks/useDemandesDevisApi'
import type { DemandeDevis } from '@/types'

interface DemandesDevisContextValue {
  demandes: DemandeDevis[]
  loading: boolean
  fetchDemandes: () => Promise<void>
  addDemande: (d: Omit<DemandeDevis, 'id'>) => void
  updateDemande: (id: number, d: Partial<DemandeDevis>) => void
  removeDemande: (id: number) => void
}

const Context = createContext<DemandesDevisContextValue | null>(null)

export function DemandesDevisProvider({ children }: { children: ReactNode }) {
  const { demandes, loading, fetchDemandes, addDemande, updateDemande, removeDemande } = useDemandesDevisApi()
  return (
    <Context.Provider value={{ demandes, loading, fetchDemandes, addDemande, updateDemande, removeDemande }}>
      {children}
    </Context.Provider>
  )
}

export function useDemandesDevis() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useDemandesDevis must be used within DemandesDevisProvider')
  return ctx
}
