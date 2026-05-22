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

function nameTokens(name: string): string[] {
  return normalizeName(name).split(' ').filter(t => t.length >= 2)
}

function matchScore(legacyKey: string, fullName: string): number {
  const k = normalizeName(legacyKey)
  const n = normalizeName(fullName)
  if (k === n) return 100
  if (n.startsWith(k) || k.startsWith(n)) return 80

  const kt = nameTokens(legacyKey)
  const nt = nameTokens(fullName)
  if (kt.length === 0 || nt.length === 0) return 0

  let score = 0
  for (const t of kt) {
    if (nt.includes(t)) score += 10
  }
  if (kt.length >= 2 && score < 20) return 0
  return score
}

function resolveUserForLegacyKey(legacyKey: string, users: TeamMoneyUserRef[]): TeamMoneyUserRef | null {
  let best: TeamMoneyUserRef | null = null
  let bestScore = 0
  for (const u of users) {
    const s = matchScore(legacyKey, u.nom_complet)
    if (s > bestScore) {
      bestScore = s
      best = u
    }
  }
  if (bestScore < 20) return null
  return best
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

/** Re-key member slots from display names to stable user ids (u:123). */
export function migrateTeamMoneyDays(
  days: TeamMoneyDayEntry[],
  users: TeamMoneyUserRef[]
): { days: TeamMoneyDayEntry[]; changed: boolean } {
  const legacyToUserId = new Map<string, number>()

  for (const day of days) {
    for (const key of Object.keys(day.members ?? {})) {
      if (isTeamMoneyMemberKey(key)) continue
      if (!legacyToUserId.has(key)) {
        const user = resolveUserForLegacyKey(key, users)
        if (user) legacyToUserId.set(key, user.id)
      }
    }
  }

  let changed = false
  const migrated = days.map(day => {
    const nextMembers: Record<string, TeamMemberSlots> = {}

    for (const [key, slot] of Object.entries(day.members ?? {})) {
      const userId = parseTeamMoneyMemberKey(key)
      if (userId != null) {
        const stable = teamMoneyMemberKey(userId)
        nextMembers[stable] = nextMembers[stable] ? mergeSlots(nextMembers[stable], slot) : slot
        if (stable !== key) changed = true
        continue
      }

      const mappedId = legacyToUserId.get(key)
      if (mappedId != null) {
        const stable = teamMoneyMemberKey(mappedId)
        nextMembers[stable] = nextMembers[stable] ? mergeSlots(nextMembers[stable], slot) : slot
        changed = true
        continue
      }

      nextMembers[key] = slot
    }

    return { ...day, members: nextMembers }
  })

  return { days: migrated, changed }
}

/** Read slot for a user — stable key, current name, or any legacy alias in the row. */
export function getSlotForUser(
  members: Record<string, TeamMemberSlots>,
  userId: number,
  displayName: string,
  users?: TeamMoneyUserRef[]
): TeamMemberSlots | undefined {
  const stable = teamMoneyMemberKey(userId)
  if (members[stable]) return members[stable]
  if (members[displayName]) return members[displayName]

  if (users) {
    for (const [key, slot] of Object.entries(members)) {
      if (isTeamMoneyMemberKey(key)) {
        if (parseTeamMoneyMemberKey(key) === userId) return slot
        continue
      }
      const matched = resolveUserForLegacyKey(key, users)
      if (matched?.id === userId) return slot
    }
  }

  return undefined
}
