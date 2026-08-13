import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useDemandesDevisApi } from '@/hooks/useDemandesDevisApi'
import type { DemandeDevis } from '@/types'

interface DemandesDevisContextValue {
  ensureLoaded: () => void
  demandes: DemandeDevis[]
  loading: boolean
  fetchDemandes: () => Promise<void>
  addDemande: (d: Omit<DemandeDevis, 'id'>) => void
  updateDemande: (id: number, d: Partial<DemandeDevis>) => void
  removeDemande: (id: number) => void
}

const Context = createContext<DemandesDevisContextValue | null>(null)

export function DemandesDevisProvider({ children }: { children: ReactNode }) {
  const api = useDemandesDevisApi()
  return (
    <Context.Provider
      value={{
        ensureLoaded: api.ensureLoaded,
        demandes: api.demandes,
        loading: api.loading,
        fetchDemandes: api.fetchDemandes,
        addDemande: api.addDemande,
        updateDemande: api.updateDemande,
        removeDemande: api.removeDemande,
      }}
    >
      {children}
    </Context.Provider>
  )
}

export function useDemandesDevis() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useDemandesDevis must be used within DemandesDevisProvider')
  useEffect(() => {
    ctx.ensureLoaded()
  }, [ctx.ensureLoaded])
  return ctx
}
