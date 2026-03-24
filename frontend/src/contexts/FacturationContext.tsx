import { createContext, useContext, type ReactNode } from 'react'
import { useFacturationApi } from '@/hooks/useFacturationApi'

interface FacturationContextValue extends ReturnType<typeof useFacturationApi> {}

const Context = createContext<FacturationContextValue | null>(null)

export function FacturationProvider({ children }: { children: ReactNode }) {
  const value = useFacturationApi()
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useFacturation() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useFacturation must be used within FacturationProvider')
  return ctx
}

