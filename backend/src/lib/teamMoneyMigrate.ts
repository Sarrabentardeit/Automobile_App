import { prisma } from './prisma'

const KEY_PREFIX = 'u:'

export function teamMoneyMemberKey(userId: number): string {
  return `${KEY_PREFIX}${userId}`
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function nameTokens(name: string): string[] {
  return normalizeName(name).split(' ').filter(t => t.length >= 2)
}

/** Score how well a legacy column key matches a user's full name. */
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
  // Require at least surname-level match when key has 2+ tokens
  if (kt.length >= 2 && score < 20) return 0
  return score
}

type UserRef = { id: number; fullName: string }

function resolveUserForLegacyKey(legacyKey: string, users: UserRef[]): UserRef | null {
  let best: UserRef | null = null
  let bestScore = 0

  for (const u of users) {
    const s = matchScore(legacyKey, u.fullName)
    if (s > bestScore) {
      bestScore = s
      best = u
    }
  }

  // Minimum confidence — avoids attaching "MOHAMED" to the wrong Mohamed when ambiguous
  if (bestScore < 20) return null
  return best
}

type DayRow = { id?: number; date?: string; members?: Record<string, unknown> }

export async function loadUsersForTeamMoneyMigration(): Promise<UserRef[]> {
  const rows = await prisma.user.findMany({
    select: { id: true, fullName: true },
    orderBy: { id: 'asc' },
  })
  return rows.map(u => ({ id: u.id, fullName: u.fullName }))
}

export function migrateTeamMoneyDaysWithUsers(
  days: unknown[],
  users: UserRef[]
): { days: unknown[]; changed: boolean; orphanKeys: string[] } {
  if (!Array.isArray(days)) return { days: [], changed: false, orphanKeys: [] }

  const legacyToUserId = new Map<string, number>()
  const orphanKeys = new Set<string>()

  for (const day of days) {
    if (!day || typeof day !== 'object') continue
    const members = (day as DayRow).members
    if (!members || typeof members !== 'object') continue
    for (const key of Object.keys(members)) {
      if (key.startsWith(KEY_PREFIX)) continue
      if (!legacyToUserId.has(key)) {
        const user = resolveUserForLegacyKey(key, users)
        if (user) legacyToUserId.set(key, user.id)
        else orphanKeys.add(key)
      }
    }
  }

  let changed = false
  const migrated = days.map(day => {
    if (!day || typeof day !== 'object' || !('members' in day)) return day
    const d = day as DayRow
    if (!d.members || typeof d.members !== 'object') return day

    const next: Record<string, unknown> = {}

    const merge = (a: unknown, b: unknown): unknown => {
      if (!a || typeof a !== 'object') return b
      if (!b || typeof b !== 'object') return a
      const x = a as Record<string, unknown>
      const y = b as Record<string, unknown>
      const pick = (f: string) => {
        const xv = x[f]
        const yv = y[f]
        if (typeof xv === 'number' && typeof yv === 'number') return Math.max(xv, yv)
        if (yv != null && yv !== '') return yv
        return xv
      }
      return {
        inHand: pick('inHand'),
        taken: pick('taken'),
        note: String(y.note ?? x.note ?? ''),
        presence: y.presence ?? x.presence ?? null,
      }
    }

    for (const [key, slot] of Object.entries(d.members)) {
      if (key.startsWith(KEY_PREFIX)) {
        const id = Number(key.slice(KEY_PREFIX.length))
        const stable = Number.isFinite(id) ? teamMoneyMemberKey(id) : key
        next[stable] = next[stable] ? merge(next[stable], slot) : slot
        if (stable !== key) changed = true
        continue
      }

      const userId = legacyToUserId.get(key)
      if (userId != null) {
        const stable = teamMoneyMemberKey(userId)
        next[stable] = next[stable] ? merge(next[stable], slot) : slot
        changed = true
      } else {
        next[key] = slot
      }
    }

    return { ...d, members: next }
  })

  return { days: migrated, changed, orphanKeys: [...orphanKeys] }
}

/** When a user's display name changes, re-link caisse history to stable u:id keys. */
export async function migrateTeamMoneyOnUserRename(
  userId: number,
  oldFullName: string,
  newFullName: string
): Promise<void> {
  const oldName = oldFullName.trim()
  const newName = newFullName.trim()
  if (!oldName || oldName === newName) return

  const users = await loadUsersForTeamMoneyMigration()
  const state = await prisma.teamMoneyState.findUnique({ where: { id: 1 } })
  if (!state?.data || !Array.isArray(state.data)) return

  const { days, changed } = migrateTeamMoneyDaysWithUsers(state.data, users)
  if (changed) {
    await prisma.teamMoneyState.update({
      where: { id: 1 },
      data: { data: days as object },
    })
  }

  const stableKey = teamMoneyMemberKey(userId)
  const outs = await prisma.moneyOut.findMany({
    where: {
      OR: [
        { source_ref: { contains: `:${oldName}` } },
        { source_ref: { contains: `:${newName}` } },
      ],
    },
  })

  for (const out of outs) {
    if (!out.source_ref) continue
    let ref = out.source_ref
    if (ref.includes(`:${oldName}`)) ref = ref.replace(`:${oldName}`, `:${stableKey}`)
    if (ref.includes(`:${newName}`)) ref = ref.replace(`:${newName}`, `:${stableKey}`)
    if (ref !== out.source_ref || out.beneficiary === oldName) {
      await prisma.moneyOut.update({
        where: { id: out.id },
        data: {
          source_ref: ref,
          beneficiary: out.beneficiary === oldName ? newName : out.beneficiary,
        },
      })
    }
  }
}

export async function repairTeamMoneyState(): Promise<{
  changed: boolean
  orphanKeys: string[]
  dayCount: number
}> {
  const state = await prisma.teamMoneyState.findUnique({ where: { id: 1 } })
  if (!state?.data || !Array.isArray(state.data)) {
    return { changed: false, orphanKeys: [], dayCount: 0 }
  }

  const users = await loadUsersForTeamMoneyMigration()
  const { days, changed, orphanKeys } = migrateTeamMoneyDaysWithUsers(state.data, users)
  if (changed) {
    await prisma.teamMoneyState.update({
      where: { id: 1 },
      data: { data: days as object },
    })
  }
  return { changed, orphanKeys, dayCount: days.length }
}
