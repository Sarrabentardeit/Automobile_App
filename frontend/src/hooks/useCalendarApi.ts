import { useState, useCallback, useEffect } from 'react'
import type { CalendarAssignment } from '@/types'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export function useCalendarApi() {
  const { getAccessToken, isAuthenticated } = useAuth()
  const [assignments, setAssignments] = useState<CalendarAssignment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAssignments = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setAssignments([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const list = await apiFetch<CalendarAssignment[]>('/calendar-assignments', { token })
      setAssignments(Array.isArray(list) ? list : [])
    } catch {
      setAssignments([])
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    if (isAuthenticated) {
      fetchAssignments()
    } else {
      setAssignments([])
      setLoading(false)
    }
  }, [isAuthenticated, fetchAssignments])

  const addAssignment = useCallback(
    async (a: Omit<CalendarAssignment, 'id'>): Promise<CalendarAssignment> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const created = await apiFetch<CalendarAssignment>('/calendar-assignments', {
        method: 'POST',
        token,
        body: JSON.stringify({
          date: a.date,
          memberName: a.memberName,
          vehicleId: a.vehicleId,
          vehicleLabel: a.vehicleLabel,
          description: a.description,
          clientName: a.clientName,
          clientTelephone: a.clientTelephone,
        }),
      })
      setAssignments(prev => [...prev, created])
      return created
    },
    [getAccessToken]
  )

  const updateAssignment = useCallback(
    async (id: number, patch: Partial<CalendarAssignment>): Promise<CalendarAssignment> => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const updated = await apiFetch<CalendarAssignment>(`/calendar-assignments/${id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({
          date: patch.date,
          memberName: patch.memberName,
          vehicleId: patch.vehicleId,
          vehicleLabel: patch.vehicleLabel,
          description: patch.description,
          clientName: patch.clientName,
          clientTelephone: patch.clientTelephone,
        }),
      })
      setAssignments(prev => prev.map(x => (x.id === id ? updated : x)))
      return updated
    },
    [getAccessToken]
  )

  const removeAssignment = useCallback(
    async (id: number): Promise<boolean> => {
      const token = getAccessToken()
      if (!token) return false
      try {
        await apiFetch(`/calendar-assignments/${id}`, { method: 'DELETE', token })
        setAssignments(prev => prev.filter(x => x.id !== id))
        return true
      } catch {
        return false
      }
    },
    [getAccessToken]
  )

  return {
    assignments,
    loading,
    fetchAssignments,
    addAssignment,
    updateAssignment,
    removeAssignment,
  }
}

