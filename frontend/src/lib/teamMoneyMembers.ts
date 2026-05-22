import type { TeamMemberSlots, TeamMoneyDayEntry } from '@/types'

export const TEAM_MONEY_MEMBER_KEY_PREFIX = 'u:'

export function teamMoneyMemberKey(userId: number): string {
  return `${TEAM_MONEY_MEMBER_KEY_PREFIX}${userId}`
}

export function isTeamMoneyMemberKey(key: string): boolean {
  return key.startsWith(TEAM_MONEY_MEMBER_KEY_PREFIX)
}

export function parseTeamMoneyMemberKey(key: string): number | null {
  if (!isTeamMoneyMemberKey(key)) return null
  const id = Number(key.slice(TEAM_MONEY_MEMBER_KEY_PREFIX.length))
  return Number.isFinite(id) ? id : null
}

export interface TeamMoneyUserRef {
  id: number
  nom_complet: string
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function mergeSlots(a: TeamMemberSlots, b: TeamMemberSlots): TeamMemberSlots {
  const pickNum = (x: number | null, y: number | null) => {
    if (x != null && y != null) return Math.max(x, y)
    return x ?? y
  }
  const noteA = (a.note ?? '').trim()
  const noteB = (b.note ?? '').trim()
  return {
    inHand: pickNum(a.inHand, b.inHand),
    taken: pickNum(a.taken, b.taken),
    note: noteB.length > noteA.length ? noteB : noteA,
    presence: b.presence ?? a.presence,
  }
}

function findUserForLegacyKey(
  key: string,
  users: TeamMoneyUserRef[],
  assignedUserIds: Set<number>
): TeamMoneyUserRef | null {
  const norm = normalizeName(key)
  const exact = users.find(
    u => !assignedUserIds.has(u.id) && normalizeName(u.nom_complet) === norm
  )
  if (exact) return exact

  const prefixMatches = users.filter(u => {
    if (assignedUserIds.has(u.id)) return false
    const n = normalizeName(u.nom_complet)
    return n.startsWith(norm) || norm.startsWith(n)
  })
  if (prefixMatches.length === 1) return prefixMatches[0]

  const first = norm.split(' ')[0]
  if (first.length >= 3) {
    const byFirst = users.filter(u => {
      if (assignedUserIds.has(u.id)) return false
      return normalizeName(u.nom_complet).startsWith(first)
    })
    if (byFirst.length === 1) return byFirst[0]
  }

  return null
}

/** Re-key member slots from display names to stable user ids (u:123). */
export function migrateTeamMoneyDays(
  days: TeamMoneyDayEntry[],
  users: TeamMoneyUserRef[]
): { days: TeamMoneyDayEntry[]; changed: boolean } {
  let changed = false
  const migrated = days.map(day => {
    const nextMembers: Record<string, TeamMemberSlots> = {}
    const assignedUserIds = new Set<number>()

    for (const [key, slot] of Object.entries(day.members ?? {})) {
      const userId = parseTeamMoneyMemberKey(key)
      if (userId != null) {
        const stable = teamMoneyMemberKey(userId)
        nextMembers[stable] = nextMembers[stable] ? mergeSlots(nextMembers[stable], slot) : slot
        assignedUserIds.add(userId)
        if (stable !== key) changed = true
        continue
      }

      const user = findUserForLegacyKey(key, users, assignedUserIds)
      if (user) {
        const stable = teamMoneyMemberKey(user.id)
        nextMembers[stable] = nextMembers[stable] ? mergeSlots(nextMembers[stable], slot) : slot
        assignedUserIds.add(user.id)
        changed = true
        continue
      }

      nextMembers[key] = slot
    }

    return { ...day, members: nextMembers }
  })

  return { days: migrated, changed }
}

export function getSlotForUser(
  members: Record<string, TeamMemberSlots>,
  userId: number,
  displayName: string
): TeamMemberSlots | undefined {
  const byId = members[teamMoneyMemberKey(userId)]
  if (byId) return byId
  return members[displayName]
}
