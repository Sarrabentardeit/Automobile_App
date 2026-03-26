import { useState, useCallback, useEffect } from 'react'
import type { ContactImportant } from '@/types'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export function useContactsImportantsApi() {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [contacts, setContacts] = useState<ContactImportant[]>([])
  const [loading, setLoading] = useState(true)

  const fetchContacts = useCallback(
    async (q?: string, categorie?: string) => {
      const token = getAccessToken()
      if (!token) {
        setContacts([])
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const params: Record<string, string> = {}
        if (q?.trim()) params.q = q.trim()
        if (categorie?.trim()) params.categorie = categorie.trim()

        const list = await apiFetch<ContactImportant[]>('/contacts-importants', {
          token,
          params: Object.keys(params).length ? params : undefined,
        })
        setContacts(Array.isArray(list) ? list : [])
      } catch {
        setContacts([])
      } finally {
        setLoading(false)
      }
    },
    [getAccessToken]
  )

  useEffect(() => {
    if (isAuthenticated) fetchContacts()
  }, [isAuthenticated, fetchContacts])

  const addContact = useCallback(
    async (c: Omit<ContactImportant, 'id'>): Promise<ContactImportant> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const created = await apiFetch<ContactImportant>('/contacts-importants', {
        method: 'POST',
        token,
        body: JSON.stringify({
          nom: c.nom,
          numero: c.numero,
          categorie: c.categorie,
          notes: c.notes,
        }),
      })
      setContacts(prev => [...prev, created])
      return created
    },
    [getAccessToken]
  )

  const updateContact = useCallback(
    async (id: number, patch: Partial<ContactImportant>): Promise<ContactImportant> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const updated = await apiFetch<ContactImportant>(`/contacts-importants/${id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          nom: patch.nom,
          numero: patch.numero,
          categorie: patch.categorie,
          notes: patch.notes,
        }),
      })
      setContacts(prev => prev.map(x => (x.id === id ? updated : x)))
      return updated
    },
    [getAccessToken]
  )

  const removeContact = useCallback(
    async (id: number): Promise<boolean> => {
      const token = getAccessToken()
      if (!token) return false
      try {
        await apiFetch(`/contacts-importants/${id}`, { method: 'DELETE', token })
        setContacts(prev => prev.filter(x => x.id !== id))
        return true
      } catch {
        return false
      }
    },
    [getAccessToken]
  )

  return {
    contacts,
    loading,
    fetchContacts,
    addContact,
    updateContact,
    removeContact,
  }
}
