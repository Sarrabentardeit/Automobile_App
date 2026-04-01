import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { TeamMoneyDayEntry } from '@/types'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

interface CaisseContextValue {
  days: TeamMoneyDayEntry[]
  loading: boolean
  setDays: React.Dispatch<React.SetStateAction<TeamMoneyDayEntry[]>>
}

const Context = createContext<CaisseContextValue | null>(null)

export function CaisseProvider({ children }: { children: ReactNode }) {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [days, setDaysState] = useState<TeamMoneyDayEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [serverUpdatedAt, setServerUpdatedAt] = useState<string | null>(null)
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve())

  const fetchDays = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setDaysState([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await apiFetch<{ data: TeamMoneyDayEntry[]; updatedAt: string | null }>('/caisse', { token })
      setDaysState(Array.isArray(res.data) ? res.data : [])
      setServerUpdatedAt(typeof res.updatedAt === 'string' ? res.updatedAt : null)
    } catch {
      setDaysState([])
      setServerUpdatedAt(null)
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    if (isAuthenticated) fetchDays()
  }, [isAuthenticated, fetchDays])

  const persistDays = useCallback(
    async (next: TeamMoneyDayEntry[]) => {
      const token = getAccessToken()
      if (!token) return
      try {
        const res = await apiFetch<{ data: TeamMoneyDayEntry[]; updatedAt: string | null }>('/caisse', {
          method: 'PUT',
          token,
          body: JSON.stringify({ days: next, expectedUpdatedAt: serverUpdatedAt }),
        })
        setServerUpdatedAt(typeof res.updatedAt === 'string' ? res.updatedAt : null)
      } catch (err) {
        console.error('Erreur sync caisse, rechargement depuis serveur', err)
        // En cas d'échec, on revient à l'état serveur pour éviter la divergence entre postes.
        await fetchDays()
      }
    },
    [getAccessToken, fetchDays, serverUpdatedAt]
  )

  const setDays: React.Dispatch<React.SetStateAction<TeamMoneyDayEntry[]>> = useCallback(
    (updater) => {
      setDaysState(prev => {
        const next = typeof updater === 'function' ? (updater as (p: TeamMoneyDayEntry[]) => TeamMoneyDayEntry[])(prev) : updater
        persistQueueRef.current = persistQueueRef.current.then(() => persistDays(next))
        return next
      })
    },
    [persistDays]
  )

  return (
    <Context.Provider value={{ days, loading, setDays }}>
      {children}
    </Context.Provider>
  )
}

export function useCaisse() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useCaisse must be used within CaisseProvider')
  return ctx
}
