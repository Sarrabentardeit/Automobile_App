import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()
const db = prisma as any

const ALLOWED_KEYS = new Set([
  'admin_corrections',
  'money_custom_in_types',
  'money_custom_out_categories',
])

router.get('/:key', authenticate(), async (req, res) => {
  try {
    const key = String(req.params.key || '')
    if (!ALLOWED_KEYS.has(key)) return res.status(400).json({ error: 'Clé non autorisée' })
    const setting = await db.appSetting.findUnique({ where: { key } })
    return res.json({ key, value: setting?.value ?? null })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:key', authenticate(), async (req, res) => {
  try {
    const key = String(req.params.key || '')
    if (!ALLOWED_KEYS.has(key)) return res.status(400).json({ error: 'Clé non autorisée' })
    const value = (req.body as { value?: unknown })?.value
    const updated = await db.appSetting.upsert({
      where: { key },
      update: { value: value ?? null },
      create: { key, value: value ?? null },
    })
    return res.json({ key: updated.key, value: updated.value })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

