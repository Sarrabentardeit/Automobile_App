import { createContext, useContext, type ReactNode } from 'react'
import { useClientsDettesApi } from '@/hooks/useClientsDettesApi'
import type { ClientAvecDette } from '@/types'

interface ClientsDettesContextValue {
  clients: ClientAvecDette[]
  loading: boolean
  fetchClients: () => Promise<void>
  addClient: (c: Omit<ClientAvecDette, 'id'>) => Promise<ClientAvecDette>
  updateClient: (id: number, c: Partial<ClientAvecDette>) => Promise<ClientAvecDette>
  removeClient: (id: number) => Promise<boolean>
}

const Context = createContext<ClientsDettesContextValue | null>(null)

export function ClientsDettesProvider({ children }: { children: ReactNode }) {
  const { clients, loading, fetchClients, addClient, updateClient, removeClient } = useClientsDettesApi()
  return (
    <Context.Provider value={{ clients, loading, fetchClients, addClient, updateClient, removeClient }}>
      {children}
    </Context.Provider>
  )
}

export function useClientsDettes() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useClientsDettes must be used within ClientsDettesProvider')
  return ctx
}
