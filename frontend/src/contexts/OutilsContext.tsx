import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { OutilMohamed, OutilAhmed } from '@/types'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

interface OutilsContextValue {
  outilsMohamed: OutilMohamed[]
  outilsAhmed: OutilAhmed[]
  loading: boolean
  addOutilMohamed: (o: Omit<OutilMohamed, 'id'>) => Promise<OutilMohamed>
  updateOutilMohamed: (id: number, o: Partial<OutilMohamed>) => Promise<OutilMohamed>
  removeOutilMohamed: (id: number) => Promise<boolean>
  addOutilAhmed: (o: Omit<OutilAhmed, 'id'>) => Promise<OutilAhmed>
  updateOutilAhmed: (id: number, o: Partial<OutilAhmed>) => Promise<OutilAhmed>
  removeOutilAhmed: (id: number) => Promise<boolean>
}

const Context = createContext<OutilsContextValue | null>(null)

export function OutilsProvider({ children }: { children: ReactNode }) {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [outilsMohamed, setOutilsMohamed] = useState<OutilMohamed[]>([])
  const [outilsAhmed, setOutilsAhmed] = useState<OutilAhmed[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOutils = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setOutilsMohamed([])
      setOutilsAhmed([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [mohamed, ahmed] = await Promise.all([
        apiFetch<OutilMohamed[]>('/outils/mohamed', { token }),
        apiFetch<OutilAhmed[]>('/outils/ahmed', { token }),
      ])
      setOutilsMohamed(Array.isArray(mohamed) ? mohamed : [])
      setOutilsAhmed(Array.isArray(ahmed) ? ahmed : [])
    } catch {
      setOutilsMohamed([])
      setOutilsAhmed([])
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    if (isAuthenticated) fetchOutils()
    else {
      setOutilsMohamed([])
      setOutilsAhmed([])
      setLoading(false)
    }
  }, [isAuthenticated, fetchOutils])

  const addOutilMohamed = useCallback(async (o: Omit<OutilMohamed, 'id'>): Promise<OutilMohamed> => {
    const token = getAccessToken()
    if (!token) throw new Error('Non authentifié')
    const created = await apiFetch<OutilMohamed>('/outils/mohamed', {
      method: 'POST',
      token,
      body: JSON.stringify(o),
    })
    setOutilsMohamed(prev => [created, ...prev])
    return created
  }, [getAccessToken])
  const updateOutilMohamed = useCallback(async (id: number, o: Partial<OutilMohamed>): Promise<OutilMohamed> => {
    const token = getAccessToken()
    if (!token) throw new Error('Non authentifié')
    const updated = await apiFetch<OutilMohamed>(`/outils/mohamed/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(o),
    })
    setOutilsMohamed(prev => prev.map(x => (x.id === id ? updated : x)))
    return updated
  }, [getAccessToken])
  const removeOutilMohamed = useCallback(async (id: number): Promise<boolean> => {
    const token = getAccessToken()
    if (!token) return false
    try {
      await apiFetch(`/outils/mohamed/${id}`, { method: 'DELETE', token })
      setOutilsMohamed(prev => prev.filter(x => x.id !== id))
      return true
    } catch {
      return false
    }
  }, [getAccessToken])

  const addOutilAhmed = useCallback(async (o: Omit<OutilAhmed, 'id'>): Promise<OutilAhmed> => {
    const token = getAccessToken()
    if (!token) throw new Error('Non authentifié')
    const created = await apiFetch<OutilAhmed>('/outils/ahmed', {
      method: 'POST',
      token,
      body: JSON.stringify(o),
    })
    setOutilsAhmed(prev => [created, ...prev])
    return created
  }, [getAccessToken])
  const updateOutilAhmed = useCallback(async (id: number, o: Partial<OutilAhmed>): Promise<OutilAhmed> => {
    const token = getAccessToken()
    if (!token) throw new Error('Non authentifié')
    const updated = await apiFetch<OutilAhmed>(`/outils/ahmed/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(o),
    })
    setOutilsAhmed(prev => prev.map(x => (x.id === id ? updated : x)))
    return updated
  }, [getAccessToken])
  const removeOutilAhmed = useCallback(async (id: number): Promise<boolean> => {
    const token = getAccessToken()
    if (!token) return false
    try {
      await apiFetch(`/outils/ahmed/${id}`, { method: 'DELETE', token })
      setOutilsAhmed(prev => prev.filter(x => x.id !== id))
      return true
    } catch {
      return false
    }
  }, [getAccessToken])

  return (
    <Context.Provider
      value={{
        outilsMohamed,
        outilsAhmed,
        loading,
        addOutilMohamed,
        updateOutilMohamed,
        removeOutilMohamed,
        addOutilAhmed,
        updateOutilAhmed,
        removeOutilAhmed,
      }}
    >
      {children}
    </Context.Provider>
  )
}

export function useOutils() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useOutils must be used within OutilsProvider')
  return ctx
}
