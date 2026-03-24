import { createContext, useContext, type ReactNode } from 'react'
import { useContactsImportantsApi } from '@/hooks/useContactsImportantsApi'

const Context = createContext<ReturnType<typeof useContactsImportantsApi> | null>(null)

export function ContactsImportantsProvider({ children }: { children: ReactNode }) {
  const api = useContactsImportantsApi()
  return (
    <Context.Provider value={api}>
      {children}
    </Context.Provider>
  )
}

export function useContactsImportants() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useContactsImportants must be used within ContactsImportantsProvider')
  return ctx
}
