import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { TEAM_MONEY_MEMBERS, type TeamMember } from '@/types'

const STORAGE_KEY = 'elmecano-team-members'
const initialMembers: TeamMember[] = TEAM_MONEY_MEMBERS.map(name => ({ name, phone: '' }))

function loadFromStorage(): TeamMember[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialMembers
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialMembers
  } catch {
    return initialMembers
  }
}

interface TeamMembersContextValue {
  members: TeamMember[]
  addMember: (name: string, phone?: string) => void
  updateMember: (index: number, payload: { name: string; phone: string }) => void
  removeMember: (index: number) => void
}

const TeamMembersContext = createContext<TeamMembersContextValue | null>(null)

export function TeamMembersProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<TeamMember[]>(loadFromStorage)
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(members)) }, [members])

  const addMember = useCallback((name: string, phone = '') => {
    const trimmedName = name.trim()
    if (!trimmedName) return
    setMembers(prev => {
      if (prev.some(m => m.name.toLowerCase() === trimmedName.toLowerCase())) return prev
      return [...prev, { name: trimmedName, phone: (phone ?? '').trim() }]
    })
  }, [])

  const updateMember = useCallback((index: number, payload: { name: string; phone: string }) => {
    const trimmedName = payload.name.trim()
    if (!trimmedName) return
    setMembers(prev => {
      const next = [...prev]
      next[index] = { name: trimmedName, phone: (payload.phone ?? '').trim() }
      return next
    })
  }, [])

  const removeMember = useCallback((index: number) => {
    setMembers(prev => prev.filter((_, i) => i !== index))
  }, [])

  return (
    <TeamMembersContext.Provider value={{ members, addMember, updateMember, removeMember }}>
      {children}
    </TeamMembersContext.Provider>
  )
}

export function useTeamMembers() {
  const ctx = useContext(TeamMembersContext)
  if (!ctx) throw new Error('useTeamMembers must be used within TeamMembersProvider')
  return ctx
}
