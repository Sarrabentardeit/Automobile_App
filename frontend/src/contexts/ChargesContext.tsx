import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { ChargeMensuelle } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch } from '@/lib/api'
import { useLazyLoader } from '@/lib/useLazyLoader'

interface ChargesContextValue {
  charges: ChargeMensuelle[]
  totalCharges: number
  loading: boolean
  ensureLoaded: () => void
  addCharge: (c: Omit<ChargeMensuelle, 'id'>) => Promise<void>
  updateCharge: (id: number, c: Partial<ChargeMensuelle>) => Promise<void>
  removeCharge: (id: number) => Promise<void>
}

const Context = createContext<ChargesContextValue | null>(null)

export function ChargesProvider({ children }: { children: ReactNode }) {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [charges, setCharges] = useState<ChargeMensuelle[]>([])
  const [loading, setLoading] = useState(false)
  const totalCharges = charges.reduce((s, c) => s + c.amount, 0)

  const fetchCharges = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setCharges([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await apiFetch<ChargeMensuelle[]>('/charges-mensuelles', {
        method: 'GET',
        token,
      })
      setCharges(data ?? [])
    } catch (err) {
      console.error('Erreur chargement charges mensuelles', err)
      setCharges([])
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    if (!isAuthenticated) {
      setCharges([])
      setLoading(false)
    }
  }, [isAuthenticated])

  const ensureLoaded = useLazyLoader(isAuthenticated, fetchCharges)

  const addCharge = useCallback(
    async (c: Omit<ChargeMensuelle, 'id'>) => {
      const token = (await getAccessToken()) ?? undefined
      if (!token) throw new Error('Session expirée. Veuillez vous reconnecter.')
      const created = await apiFetch<ChargeMensuelle>('/charges-mensuelles', {
        method: 'POST',
        token,
        body: JSON.stringify(c),
      })
      if (created) {
        setCharges(prev => [...prev, created])
      }
    },
    [getAccessToken],
  )

  const updateCharge = useCallback(
    async (id: number, c: Partial<ChargeMensuelle>) => {
      const token = (await getAccessToken()) ?? undefined
      if (!token) throw new Error('Session expirée. Veuillez vous reconnecter.')
      const updated = await apiFetch<ChargeMensuelle>(`/charges-mensuelles/${id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify(c),
      })
      if (updated) {
        setCharges(prev => prev.map(x => (x.id === id ? updated : x)))
      }
    },
    [getAccessToken],
  )

  const removeCharge = useCallback(
    async (id: number) => {
      const token = (await getAccessToken()) ?? undefined
      if (!token) throw new Error('Session expirée. Veuillez vous reconnecter.')
      await apiFetch<void>(`/charges-mensuelles/${id}`, {
        method: 'DELETE',
        token,
      })
      setCharges(prev => prev.filter(x => x.id !== id))
    },
    [getAccessToken],
  )

  return (
    <Context.Provider
      value={{ charges, totalCharges, loading, ensureLoaded, addCharge, updateCharge, removeCharge }}
    >
      {children}
    </Context.Provider>
  )
}

export function useCharges() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useCharges must be used within ChargesProvider')
  useEffect(() => {
    ctx.ensureLoaded()
  }, [ctx.ensureLoaded])
  return ctx
}
