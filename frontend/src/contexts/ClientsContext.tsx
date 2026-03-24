import { createContext, useContext, type ReactNode } from 'react'
import { useClients as useClientsHook } from '@/hooks/useClients'

interface ClientsContextValue extends ReturnType<typeof useClientsHook> {}

const Context = createContext<ClientsContextValue | null>(null)

export function ClientsProvider({ children }: { children: ReactNode }) {
  const value = useClientsHook()
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useClients() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useClients must be used within ClientsProvider')
  return ctx
}
