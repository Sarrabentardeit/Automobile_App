import { prisma } from './prisma'

const KEY_PREFIX = 'u:'

export function teamMoneyMemberKey(userId: number): string {
  return `${KEY_PREFIX}${userId}`
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

  const stableKey = teamMoneyMemberKey(userId)
  const state = await prisma.teamMoneyState.findUnique({ where: { id: 1 } })
  if (state?.data && Array.isArray(state.data)) {
    const days = state.data as Array<{ id?: number; members?: Record<string, unknown> }>
    let changed = false

    for (const day of days) {
      if (!day.members || typeof day.members !== 'object') continue
      const members = day.members

      for (const label of [oldName, newName]) {
        if (label && members[label] != null) {
          if (members[stableKey] == null) {
            members[stableKey] = members[label]
          }
          delete members[label]
          changed = true
        }
      }
    }

    if (changed) {
      await prisma.teamMoneyState.update({
        where: { id: 1 },
        data: { data: days },
      })
    }
  }

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
