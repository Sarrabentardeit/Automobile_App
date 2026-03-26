import { useState, useCallback, useEffect } from 'react'
import type { ClientAvecDette } from '@/types'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export function useClientsDettesApi() {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [clients, setClients] = useState<ClientAvecDette[]>([])
  const [loading, setLoading] = useState(true)

  const fetchClients = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setClients([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const list = await apiFetch<ClientAvecDette[]>('/clients-dettes', { token })
      setClients(Array.isArray(list) ? list : [])
    } catch {
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    if (isAuthenticated) fetchClients()
  }, [isAuthenticated, fetchClients])

  const addClient = useCallback(
    async (c: Omit<ClientAvecDette, 'id'>): Promise<ClientAvecDette> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const created = await apiFetch<ClientAvecDette>('/clients-dettes', {
        method: 'POST',
        token,
        body: JSON.stringify({
          clientName: c.clientName,
          telephoneClient: c.telephoneClient,
          designation: c.designation,
          reste: c.reste,
          notes: c.notes,
        }),
      })
      setClients(prev => [...prev, created])
      return created
    },
    [getAccessToken]
  )

  const updateClient = useCallback(
    async (id: number, patch: Partial<ClientAvecDette>): Promise<ClientAvecDette> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const updated = await apiFetch<ClientAvecDette>(`/clients-dettes/${id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          clientName: patch.clientName,
          telephoneClient: patch.telephoneClient,
          designation: patch.designation,
          reste: patch.reste,
          notes: patch.notes,
        }),
      })
      setClients(prev => prev.map(x => (x.id === id ? updated : x)))
      return updated
    },
    [getAccessToken]
  )

  const removeClient = useCallback(
    async (id: number): Promise<boolean> => {
      const token = getAccessToken()
      if (!token) return false
      try {
        await apiFetch(`/clients-dettes/${id}`, { method: 'DELETE', token })
        setClients(prev => prev.filter(x => x.id !== id))
        return true
      } catch {
        return false
      }
    },
    [getAccessToken]
  )

  return {
    clients,
    loading,
    fetchClients,
    addClient,
    updateClient,
    removeClient,
  }
}
