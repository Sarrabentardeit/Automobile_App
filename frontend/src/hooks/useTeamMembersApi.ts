import { useState, useCallback, useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import type { TeamMember } from '@/types'

type TeamMemberRow = TeamMember & { id: number }

export function useTeamMembersApi() {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [members, setMembers] = useState<TeamMemberRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMembers = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setMembers([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const list = await apiFetch<TeamMemberRow[]>('/team-members', { token })
      setMembers(Array.isArray(list) ? list : [])
    } catch {
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    if (isAuthenticated) fetchMembers()
  }, [isAuthenticated, fetchMembers])

  const addMember = useCallback(
    async (name: string, phone = ''): Promise<void> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const created = await apiFetch<TeamMemberRow>('/team-members', {
        method: 'POST',
        token,
        body: JSON.stringify({ name, phone }),
      })
      setMembers(prev => [...prev, created])
    },
    [getAccessToken]
  )

  const updateMember = useCallback(
    async (id: number, payload: { name: string; phone: string }): Promise<void> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const updated = await apiFetch<TeamMemberRow>(`/team-members/${id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify(payload),
      })
      setMembers(prev => prev.map(m => (m.id === id ? updated : m)))
    },
    [getAccessToken]
  )

  const removeMember = useCallback(
    async (id: number): Promise<void> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      await apiFetch(`/team-members/${id}`, { method: 'DELETE', token })
      setMembers(prev => prev.filter(m => m.id !== id))
    },
    [getAccessToken]
  )

  return {
    members,
    loading,
    fetchMembers,
    addMember,
    updateMember,
    removeMember,
  }
}

