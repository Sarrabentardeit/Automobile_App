import { createContext, useContext, useCallback, type ReactNode } from 'react'
import type { TeamMember } from '@/types'
import { useTeamMembersApi } from '@/hooks/useTeamMembersApi'

interface TeamMembersContextValue {
  members: TeamMember[]
  loading: boolean
  addMember: (name: string, phone?: string) => Promise<void>
  updateMember: (index: number, payload: { name: string; phone: string }) => Promise<void>
  removeMember: (index: number) => Promise<void>
}

const TeamMembersContext = createContext<TeamMembersContextValue | null>(null)

export function TeamMembersProvider({ children }: { children: ReactNode }) {
  const api = useTeamMembersApi()
  const members: TeamMember[] = api.members.map(m => ({ name: m.name, phone: m.phone }))

  const addMember = useCallback(async (name: string, phone = '') => {
    const trimmedName = name.trim()
    if (!trimmedName) return
    if (members.some(m => m.name.toLowerCase() === trimmedName.toLowerCase())) return
    await api.addMember(trimmedName, (phone ?? '').trim())
  }, [api, members])

  const updateMember = useCallback(async (index: number, payload: { name: string; phone: string }) => {
    const trimmedName = payload.name.trim()
    if (!trimmedName) return
    const row = api.members[index]
    if (!row) return
    await api.updateMember(row.id, { name: trimmedName, phone: (payload.phone ?? '').trim() })
  }, [api])

  const removeMember = useCallback(async (index: number) => {
    const row = api.members[index]
    if (!row) return
    await api.removeMember(row.id)
  }, [api])

  return (
    <TeamMembersContext.Provider value={{ members, loading: api.loading, addMember, updateMember, removeMember }}>
      {children}
    </TeamMembersContext.Provider>
  )
}

export function useTeamMembers() {
  const ctx = useContext(TeamMembersContext)
  if (!ctx) throw new Error('useTeamMembers must be used within TeamMembersProvider')
  return ctx
}
