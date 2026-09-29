import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export interface GarageOperation {
  id: number
  nom: string
  cle: string | null
  actif: boolean
}

interface OperationsContextValue {
  operations: GarageOperation[]
  loading: boolean
  refresh: () => Promise<void>
  addOperation: (nom: string) => Promise<GarageOperation>
  updateOperation: (id: number, patch: { nom?: string; actif?: boolean }) => Promise<GarageOperation>
}

const Context = createContext<OperationsContextValue | null>(null)

export function OperationsProvider({ children }: { children: ReactNode }) {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [operations, setOperations] = useState<GarageOperation[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setOperations([])
      return
    }
    setLoading(true)
    try {
      const rows = await apiFetch<GarageOperation[]>('/operations', { token })
      setOperations(Array.isArray(rows) ? rows : [])
    } catch {
      setOperations([])
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    if (!isAuthenticated) {
      setOperations([])
      return
    }
    void refresh()
  }, [isAuthenticated, refresh])

  const addOperation = useCallback(async (nom: string) => {
    const token = getAccessToken()
    if (!token) throw new Error('Non authentifié')
    const created = await apiFetch<GarageOperation>('/operations', {
      method: 'POST',
      token,
      body: JSON.stringify({ nom }),
    })
    setOperations((prev) => [...prev, created])
    return created
  }, [getAccessToken])

  const updateOperation = useCallback(async (id: number, patch: { nom?: string; actif?: boolean }) => {
    const token = getAccessToken()
    if (!token) throw new Error('Non authentifié')
    const updated = await apiFetch<GarageOperation>(`/operations/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(patch),
    })
    setOperations((prev) => prev.map((o) => (o.id === id ? updated : o)))
    return updated
  }, [getAccessToken])

  return (
    <Context.Provider value={{ operations, loading, refresh, addOperation, updateOperation }}>
      {children}
    </Context.Provider>
  )
}

export function useOperations() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useOperations must be used within OperationsProvider')
  return ctx
}
