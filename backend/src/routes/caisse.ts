import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()

// GET /caisse - renvoie le tableau complet des jours TeamMoneyDayEntry (JSON)
router.get('/', authenticate(), async (_req, res) => {
  try {
    const state = await prisma.teamMoneyState.findUnique({ where: { id: 1 } })
    if (!state) {
      return res.json([])
    }
    const data = (state.data ?? []) as unknown
    if (!Array.isArray(data)) return res.json([])
    return res.json(data)
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
    const days = req.body as unknown
    if (!Array.isArray(days)) {
      return res.status(400).json({ error: 'Le corps doit être un tableau' })
    }

    const now = new Date()
    const state = await prisma.teamMoneyState.upsert({
      where: { id: 1 },
      update: { data: days, updatedAt: now },
      create: { id: 1, data: days, updatedAt: now },
    })

    return res.json(state.data)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

