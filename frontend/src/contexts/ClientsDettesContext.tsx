import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { ClientAvecDette } from '@/types'
import { mockClientsAvecDettes } from '@/data/mock'

const STORAGE_KEY = 'elmecano-clients-dettes'

function loadFromStorage(): ClientAvecDette[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return mockClientsAvecDettes
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : mockClientsAvecDettes
  } catch {
    return mockClientsAvecDettes
  }
}

function saveToStorage(data: ClientAvecDette[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

interface ClientsDettesContextValue {
  clients: ClientAvecDette[]
  addClient: (c: Omit<ClientAvecDette, 'id'>) => void
  updateClient: (id: number, c: Partial<ClientAvecDette>) => void
  removeClient: (id: number) => void
}

const Context = createContext<ClientsDettesContextValue | null>(null)

export function ClientsDettesProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<ClientAvecDette[]>(loadFromStorage)
  useEffect(() => { saveToStorage(clients) }, [clients])
  const addClient = useCallback((c: Omit<ClientAvecDette, 'id'>) => {
    setClients(prev => [...prev, { ...c, id: Math.max(0, ...prev.map(x => x.id)) + 1 }])
  }, [])
  const updateClient = useCallback((id: number, c: Partial<ClientAvecDette>) => {
    setClients(prev => prev.map(x => (x.id === id ? { ...x, ...c } : x)))
  }, [])
  const removeClient = useCallback((id: number) => {
    setClients(prev => prev.filter(x => x.id !== id))
  }, [])
  return (
    <Context.Provider value={{ clients, addClient, updateClient, removeClient }}>
      {children}
    </Context.Provider>
  )
}

export function useClientsDettes() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useClientsDettes must be used within ClientsDettesProvider')
  return ctx
}
