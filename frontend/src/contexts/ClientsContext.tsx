import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Client } from '@/types'
import { mockClients } from '@/data/mock'

const STORAGE_KEY = 'elmecano-clients'

function loadFromStorage(): Client[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return mockClients
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : mockClients
  } catch {
    return mockClients
  }
}

function saveToStorage(data: Client[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

interface ClientsContextValue {
  clients: Client[]
  addClient: (c: Omit<Client, 'id'>) => void
  updateClient: (id: number, c: Partial<Client>) => void
  removeClient: (id: number) => void
}

const Context = createContext<ClientsContextValue | null>(null)

export function ClientsProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>(loadFromStorage)
  useEffect(() => { saveToStorage(clients) }, [clients])
  const addClient = useCallback((c: Omit<Client, 'id'>) => {
    setClients(prev => [...prev, { ...c, id: Math.max(0, ...prev.map(x => x.id)) + 1 }])
  }, [])
  const updateClient = useCallback((id: number, c: Partial<Client>) => {
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

export function useClients() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useClients must be used within ClientsProvider')
  return ctx
}
