import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useFournisseursApi } from '@/hooks/useFournisseursApi'

const FournisseursContext = createContext<ReturnType<typeof useFournisseursApi> | null>(null)

export function FournisseursProvider({ children }: { children: ReactNode }) {
  const api = useFournisseursApi()
  return <FournisseursContext.Provider value={api}>{children}</FournisseursContext.Provider>
}

export function useFournisseurs() {
  const ctx = useContext(FournisseursContext)
  if (!ctx) throw new Error('useFournisseurs must be used within FournisseursProvider')
  useEffect(() => {
    ctx.ensureLoaded()
  }, [ctx.ensureLoaded])
  return ctx
}
