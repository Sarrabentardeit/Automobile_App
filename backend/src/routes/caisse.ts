import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const KEY_PREFIX = 'u:'

function teamMoneyMemberKey(userId: number): string {
  return `${KEY_PREFIX}${userId}`
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** On read: attach legacy name keys to stable u:{userId} keys. */
async function migrateTeamMoneyDaysOnRead(days: unknown[]): Promise<{ days: unknown[]; changed: boolean }> {
  const users = await prisma.user.findMany({
    where: { statut: 'actif' },
    select: { id: true, fullName: true },
  })
  let changed = false
  const assigned = new Set<number>()

  const migrated = days.map(day => {
    if (!day || typeof day !== 'object' || !('members' in day)) return day
    const d = day as { members?: Record<string, unknown> }
    if (!d.members || typeof d.members !== 'object') return day

    const next: Record<string, unknown> = {}
    for (const [key, slot] of Object.entries(d.members)) {
      if (key.startsWith(KEY_PREFIX)) {
        const id = Number(key.slice(KEY_PREFIX.length))
        if (Number.isFinite(id)) {
          next[key] = slot
          assigned.add(id)
          if (key !== teamMoneyMemberKey(id)) changed = true
        } else {
          next[key] = slot
        }
        continue
      }

      const norm = normalizeName(key)
      let user =
        users.find(u => !assigned.has(u.id) && normalizeName(u.fullName) === norm) ?? null
      if (!user) {
        const prefix = users.filter(u => {
          if (assigned.has(u.id)) return false
          const n = normalizeName(u.fullName)
          return n.startsWith(norm) || norm.startsWith(n)
        })
        if (prefix.length === 1) user = prefix[0]
      }

      if (user) {
        const stable = teamMoneyMemberKey(user.id)
        next[stable] = next[stable] ?? slot
        assigned.add(user.id)
        changed = true
      } else {
        next[key] = slot
      }
    }

    return { ...d, members: next }
  })

  return { days: migrated, changed }
}

const router = Router()

// GET /caisse - renvoie le tableau complet des jours TeamMoneyDayEntry (JSON)
router.get('/', authenticate(), async (_req, res) => {
  try {
    const state = await prisma.teamMoneyState.findUnique({ where: { id: 1 } })
    if (!state) {
      return res.json({ data: [], updatedAt: null })
    }
    const data = (state.data ?? []) as unknown
    if (!Array.isArray(data)) return res.json({ data: [], updatedAt: state.updatedAt.toISOString() })

    const { days: migrated, changed } = await migrateTeamMoneyDaysOnRead(data)
    if (changed) {
      await prisma.teamMoneyState.update({
        where: { id: 1 },
        data: { data: migrated },
      })
    }
    return res.json({ data: migrated, updatedAt: state.updatedAt.toISOString() })
  } catch (err) {
    console.error(err)
    if (typeof (prisma as any).teamMoneyState === 'undefined') {
      return res.status(500).json({
        error: 'Backend: exécutez "npx prisma generate" puis redémarrez le serveur.',
      })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /caisse - remplace le tableau complet des jours
router.put('/', authenticate(), async (req, res) => {
  try {
    const body = req.body as unknown
    const isLegacyArray = Array.isArray(body)
    const days = isLegacyArray ? body : (body as { days?: unknown }).days
    const expectedUpdatedAt = !isLegacyArray ? (body as { expectedUpdatedAt?: string | null }).expectedUpdatedAt : undefined
    if (!Array.isArray(days)) {
      return res.status(400).json({ error: 'Le corps doit contenir "days" (tableau)' })
    }

    const existing = await prisma.teamMoneyState.findUnique({ where: { id: 1 } })
    if (expectedUpdatedAt !== undefined && existing) {
      const current = existing.updatedAt.toISOString()
      if (expectedUpdatedAt !== current) {
        return res.status(409).json({ error: 'Conflit de version, rechargez les données caisse' })
      }
    }

    const now = new Date()
    const state = await prisma.teamMoneyState.upsert({
      where: { id: 1 },
      update: { data: days, updatedAt: now },
      create: { id: 1, data: days, updatedAt: now },
    })

    return res.json({ data: state.data, updatedAt: state.updatedAt.toISOString() })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

