import { useState, useCallback } from 'react'
import { useLazyLoader } from '@/lib/useLazyLoader'
import type { NotePersonnelle, NotePersonnelleInput } from '@/types'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export function useNotesPersonnellesApi() {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [notes, setNotes] = useState<NotePersonnelle[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotes = useCallback(
    async (q?: string) => {
      const token = getAccessToken()
      if (!token) {
        setNotes([])
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const params: Record<string, string> = {}
        if (q?.trim()) params.q = q.trim()
        const list = await apiFetch<NotePersonnelle[]>('/notes-personnelles', {
          token,
          params: Object.keys(params).length ? params : undefined,
        })
        setNotes(Array.isArray(list) ? list : [])
      } catch {
        setNotes([])
      } finally {
        setLoading(false)
      }
    },
    [getAccessToken]
  )

  const ensureLoaded = useLazyLoader(isAuthenticated, fetchNotes)

  const addNote = useCallback(
    async (input: NotePersonnelleInput): Promise<NotePersonnelle> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const created = await apiFetch<NotePersonnelle>('/notes-personnelles', {
        method: 'POST',
        token,
        body: JSON.stringify(input),
      })
      setNotes(prev => [created, ...prev])
      return created
    },
    [getAccessToken]
  )

  const updateNote = useCallback(
    async (id: number, patch: NotePersonnelleInput): Promise<NotePersonnelle> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const updated = await apiFetch<NotePersonnelle>(`/notes-personnelles/${id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify(patch),
      })
      setNotes(prev => {
        const next = prev.map(n => (n.id === id ? updated : n))
        return next.sort((a, b) => {
          if (a.epinglee !== b.epinglee) return a.epinglee ? -1 : 1
          return b.updatedAt.localeCompare(a.updatedAt)
        })
      })
      return updated
    },
    [getAccessToken]
  )

  const removeNote = useCallback(
    async (id: number): Promise<boolean> => {
      const token = getAccessToken()
      if (!token) return false
      try {
        await apiFetch(`/notes-personnelles/${id}`, { method: 'DELETE', token })
        setNotes(prev => prev.filter(n => n.id !== id))
        return true
      } catch {
        return false
      }
    },
    [getAccessToken]
  )

  return { notes, loading, fetchNotes, ensureLoaded, addNote, updateNote, removeNote }
}
