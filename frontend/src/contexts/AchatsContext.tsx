import { createContext, useContext, type ReactNode } from 'react'
import { useAchatsApi } from '@/hooks/useAchatsApi'

interface AchatsContextValue extends ReturnType<typeof useAchatsApi> {}

const Context = createContext<AchatsContextValue | null>(null)

export function AchatsProvider({ children }: { children: ReactNode }) {
  const value = useAchatsApi()
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useAchats() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useAchats must be used within AchatsProvider')
  return ctx
}
