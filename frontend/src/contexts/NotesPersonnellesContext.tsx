import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useNotesPersonnellesApi } from '@/hooks/useNotesPersonnellesApi'

const Context = createContext<ReturnType<typeof useNotesPersonnellesApi> | null>(null)

export function NotesPersonnellesProvider({ children }: { children: ReactNode }) {
  const api = useNotesPersonnellesApi()
  return <Context.Provider value={api}>{children}</Context.Provider>
}

export function useNotesPersonnelles() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useNotesPersonnelles must be used within NotesPersonnellesProvider')
  useEffect(() => {
    ctx.ensureLoaded()
  }, [ctx.ensureLoaded])
  return ctx
}
