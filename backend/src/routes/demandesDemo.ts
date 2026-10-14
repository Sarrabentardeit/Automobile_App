import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()
const db = prisma as any

router.post('/', async (req, res) => {
  try {
    const body = req.body as {
      nom?: string
      garage?: string
      telephone?: string
      ponts?: number | string
      message?: string
    }
    const nom = (body.nom ?? '').trim()
    const garage = (body.garage ?? '').trim()
    const telephone = (body.telephone ?? '').trim()
    if (!nom || !garage || !telephone) {
      return res.status(400).json({ error: 'Le nom, le garage et le téléphone sont requis.' })
    }
    const pontsRaw = body.ponts === '' || body.ponts == null ? null : Number(body.ponts)
    const ponts = pontsRaw != null && Number.isFinite(pontsRaw) && pontsRaw >= 0 ? Math.round(pontsRaw) : null
    const created = await db.demandeDemo.create({
      data: {
        nom,
        garage,
        telephone,
        ponts,
        message: (body.message ?? '').trim() || null,
      },
    })
    return res.status(201).json({ id: created.id })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'La demande n’a pas pu être envoyée.' })
  }
})

export default router
