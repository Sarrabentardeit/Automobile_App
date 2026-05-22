import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'
import {
  loadUsersForTeamMoneyMigration,
  migrateTeamMoneyDaysWithUsers,
  repairTeamMoneyState,
} from '../lib/teamMoneyMigrate'

const router = Router()

function isAdmin(req: AuthRequest): boolean {
  return req.user?.role === 'admin'
}

// GET /caisse - renvoie le tableau complet des jours TeamMoneyDayEntry (JSON)
router.get('/', authenticate(), async (_req, res) => {
  try {
    const state = await prisma.teamMoneyState.findUnique({ where: { id: 1 } })
    if (!state) {
      return res.json({ data: [], updatedAt: null })
    }
    const data = (state.data ?? []) as unknown
    if (!Array.isArray(data)) return res.json({ data: [], updatedAt: state.updatedAt.toISOString() })

    const users = await loadUsersForTeamMoneyMigration()
    const { days: migrated, changed } = migrateTeamMoneyDaysWithUsers(data, users)
    if (changed) {
      await prisma.teamMoneyState.update({
        where: { id: 1 },
        data: { data: migrated as object },
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

// POST /caisse/repair — admin: force re-link legacy name columns to user ids
router.post('/repair', authenticate(), async (req: AuthRequest, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' })
  }
  try {
    const result = await repairTeamMoneyState()
    const state = await prisma.teamMoneyState.findUnique({ where: { id: 1 } })
    return res.json({
      ...result,
      data: state?.data ?? [],
      updatedAt: state?.updatedAt?.toISOString() ?? null,
    })
  } catch (err) {
    console.error(err)
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

    const users = await loadUsersForTeamMoneyMigration()
    const { days: normalized } = migrateTeamMoneyDaysWithUsers(days, users)

    const now = new Date()
    const state = await prisma.teamMoneyState.upsert({
      where: { id: 1 },
      update: { data: normalized as object, updatedAt: now },
      create: { id: 1, data: normalized as object, updatedAt: now },
    })

    return res.json({ data: state.data, updatedAt: state.updatedAt.toISOString() })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
