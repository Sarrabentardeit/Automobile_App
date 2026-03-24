import { createContext, useContext, type ReactNode } from 'react'
import { useReclamationsApi } from '@/hooks/useReclamationsApi'
import type { Reclamation } from '@/types'

interface ReclamationsContextValue {
  reclamations: Reclamation[]
  loading: boolean
  fetchReclamations: () => Promise<void>
  addReclamation: (r: Omit<Reclamation, 'id'>) => Promise<Reclamation>
  updateReclamation: (id: number, r: Partial<Reclamation>) => Promise<Reclamation>
  removeReclamation: (id: number) => Promise<boolean>
}

const Context = createContext<ReclamationsContextValue | null>(null)

export function ReclamationsProvider({ children }: { children: ReactNode }) {
  const api = useReclamationsApi()
  return <Context.Provider value={api}>{children}</Context.Provider>
}

export function useReclamations() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useReclamations must be used within ReclamationsProvider')
  return ctx
}
