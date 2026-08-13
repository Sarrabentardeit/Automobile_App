import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useClientsDettesApi } from '@/hooks/useClientsDettesApi'
import type { ClientAvecDette } from '@/types'

interface ClientsDettesContextValue {
  ensureLoaded: () => void
  clients: ClientAvecDette[]
  loading: boolean
  fetchClients: () => Promise<void>
  addClient: (c: Omit<ClientAvecDette, 'id'>) => Promise<ClientAvecDette>
  updateClient: (id: number, c: Partial<ClientAvecDette>) => Promise<ClientAvecDette>
  removeClient: (id: number) => Promise<boolean>
}

const Context = createContext<ClientsDettesContextValue | null>(null)

export function ClientsDettesProvider({ children }: { children: ReactNode }) {
  const api = useClientsDettesApi()
  return (
    <Context.Provider
      value={{
        ensureLoaded: api.ensureLoaded,
        clients: api.clients,
        loading: api.loading,
        fetchClients: api.fetchClients,
        addClient: api.addClient,
        updateClient: api.updateClient,
        removeClient: api.removeClient,
      }}
    >
      {children}
    </Context.Provider>
  )
}

export function useClientsDettes() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useClientsDettes must be used within ClientsDettesProvider')
  useEffect(() => {
    ctx.ensureLoaded()
  }, [ctx.ensureLoaded])
  return ctx
}
