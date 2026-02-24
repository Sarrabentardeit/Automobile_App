import { createContext, useContext, type ReactNode } from 'react'
import { useVehicules } from '@/hooks/useVehicules'

type VehiculesContextType = ReturnType<typeof useVehicules>

const VehiculesContext = createContext<VehiculesContextType | null>(null)

export function VehiculesProvider({ children }: { children: ReactNode }) {
  const vehiculesState = useVehicules()
  return (
    <VehiculesContext.Provider value={vehiculesState}>
      {children}
    </VehiculesContext.Provider>
  )
}

export function useVehiculesContext() {
  const ctx = useContext(VehiculesContext)
  if (!ctx) throw new Error('useVehiculesContext must be used within VehiculesProvider')
  return ctx
}
