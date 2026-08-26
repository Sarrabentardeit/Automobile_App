import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { OutilMohamed, OutilAhmed, OutilNouri } from '@/types'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useLazyLoader } from '@/lib/useLazyLoader'

interface OutilsContextValue {
  outilsMohamed: OutilMohamed[]
  outilsAhmed: OutilAhmed[]
  outilsNouri: OutilNouri[]
  loading: boolean
  ensureLoaded: () => void
  addOutilMohamed: (o: Omit<OutilMohamed, 'id'>) => Promise<OutilMohamed>
  updateOutilMohamed: (id: number, o: Partial<OutilMohamed>) => Promise<OutilMohamed>
  removeOutilMohamed: (id: number) => Promise<boolean>
  addOutilAhmed: (o: Omit<OutilAhmed, 'id'>) => Promise<OutilAhmed>
  updateOutilAhmed: (id: number, o: Partial<OutilAhmed>) => Promise<OutilAhmed>
  removeOutilAhmed: (id: number) => Promise<boolean>
  addOutilNouri: (o: Omit<OutilNouri, 'id'>) => Promise<OutilNouri>
  updateOutilNouri: (id: number, o: Partial<OutilNouri>) => Promise<OutilNouri>
  removeOutilNouri: (id: number) => Promise<boolean>
}

const Context = createContext<OutilsContextValue | null>(null)

export function OutilsProvider({ children }: { children: ReactNode }) {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [outilsMohamed, setOutilsMohamed] = useState<OutilMohamed[]>([])
  const [outilsAhmed, setOutilsAhmed] = useState<OutilAhmed[]>([])
  const [outilsNouri, setOutilsNouri] = useState<OutilNouri[]>([])
  const [loading, setLoading] = useState(false)

  const fetchOutils = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setOutilsMohamed([])
      setOutilsAhmed([])
      setOutilsNouri([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [mohamed, ahmed, nouri] = await Promise.all([
        apiFetch<OutilMohamed[]>('/outils/mohamed', { token }),
        apiFetch<OutilAhmed[]>('/outils/ahmed', { token }),
        apiFetch<OutilNouri[]>('/outils/nouri', { token }),
      ])
      setOutilsMohamed(Array.isArray(mohamed) ? mohamed : [])
      setOutilsAhmed(Array.isArray(ahmed) ? ahmed : [])
      setOutilsNouri(Array.isArray(nouri) ? nouri : [])
    } catch {
      setOutilsMohamed([])
      setOutilsAhmed([])
      setOutilsNouri([])
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    if (!isAuthenticated) {
      setOutilsMohamed([])
      setOutilsAhmed([])
      setOutilsNouri([])
      setLoading(false)
    }
  }, [isAuthenticated])

  const ensureLoaded = useLazyLoader(isAuthenticated, fetchOutils)

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

  const addOutilNouri = useCallback(async (o: Omit<OutilNouri, 'id'>): Promise<OutilNouri> => {
    const token = getAccessToken()
    if (!token) throw new Error('Non authentifié')
    const created = await apiFetch<OutilNouri>('/outils/nouri', {
      method: 'POST',
      token,
      body: JSON.stringify(o),
    })
    setOutilsNouri(prev => [created, ...prev])
    return created
  }, [getAccessToken])
  const updateOutilNouri = useCallback(async (id: number, o: Partial<OutilNouri>): Promise<OutilNouri> => {
    const token = getAccessToken()
    if (!token) throw new Error('Non authentifié')
    const updated = await apiFetch<OutilNouri>(`/outils/nouri/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(o),
    })
    setOutilsNouri(prev => prev.map(x => (x.id === id ? updated : x)))
    return updated
  }, [getAccessToken])
  const removeOutilNouri = useCallback(async (id: number): Promise<boolean> => {
    const token = getAccessToken()
    if (!token) return false
    try {
      await apiFetch(`/outils/nouri/${id}`, { method: 'DELETE', token })
      setOutilsNouri(prev => prev.filter(x => x.id !== id))
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
        outilsNouri,
        loading,
        ensureLoaded,
        addOutilMohamed,
        updateOutilMohamed,
        removeOutilMohamed,
        addOutilAhmed,
        updateOutilAhmed,
        removeOutilAhmed,
        addOutilNouri,
        updateOutilNouri,
        removeOutilNouri,
      }}
    >
      {children}
    </Context.Provider>
  )
}

export function useOutils() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useOutils must be used within OutilsProvider')
  useEffect(() => {
    ctx.ensureLoaded()
  }, [ctx.ensureLoaded])
  return ctx
}
