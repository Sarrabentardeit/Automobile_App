export type PresenceStatut =
  | 'conges'
  | 'a_temps'
  | 'absent'
  | 'retard'
  | 'autorisation'
  | 'conges_maladie'
  | 'heures_sup'

export const PRESENCE_CONFIG: Record<PresenceStatut, { label: string; color: string }> = {
  a_temps:        { label: 'À TEMPS',       color: '#22c55e' },
  retard:         { label: 'RETARD',         color: '#f97316' },
  absent:         { label: 'ABSENT',         color: '#ef4444' },
  conges:         { label: 'CONGÉ',          color: '#0ea5e9' },
  conges_maladie: { label: 'MALADIE',        color: '#ec4899' },
  autorisation:   { label: 'AUTORISATION',   color: '#a855f7' },
  heures_sup:     { label: 'HEURES SUPP.',   color: '#06b6d4' },
}

export const ALL_PRESENCE_STATUTS: PresenceStatut[] = [
  'a_temps', 'retard', 'absent', 'conges', 'conges_maladie', 'autorisation', 'heures_sup',
]

export interface TeamMemberSlots {
  inHand: number | null
  taken: number | null
  note: string
  presence: PresenceStatut | null
}

export interface TeamMoneyDayEntry {
  id: number
  date: string
  members: Record<string, TeamMemberSlots>
}

export interface CaisseState {
  data: TeamMoneyDayEntry[]
  updatedAt: string | null
}
