import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()
const db = prisma as any

type OutilMohamedRow = {
  id: number
  date: string
  vehicule: string
  outillage: string
  prix_garage: number
  prix_mohamed: number | null
}

type OutilAhmedRow = {
  id: number
  date: string
  vehicule: string
  type_travaux: string
  prix_garage: number | null
  prix_ahmed: number
}

function toMohamedDto(r: OutilMohamedRow) {
  return {
    id: r.id,
    date: r.date,
    vehicule: r.vehicule,
    outillage: r.outillage,
    prixGarage: r.prix_garage,
    prixMohamed: r.prix_mohamed ?? undefined,
  }
}

function toAhmedDto(r: OutilAhmedRow) {
  return {
    id: r.id,
    date: r.date,
    vehicule: r.vehicule,
    typeTravaux: r.type_travaux,
    prixGarage: r.prix_garage ?? undefined,
    prixAhmed: r.prix_ahmed,
  }
}

router.get('/mohamed', authenticate(), async (_req, res) => {
  try {
    const rows = (await db.outilMohamedEntry.findMany({
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    })) as OutilMohamedRow[]
    return res.json(rows.map(toMohamedDto))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/mohamed', authenticate(), async (req, res) => {
  try {
    const body = req.body as {
      date?: string
      vehicule?: string
      outillage?: string
      prixGarage?: number
      prixMohamed?: number
    }
    if (!body.date || !body.outillage?.trim() || typeof body.prixGarage !== 'number') {
      return res.status(400).json({ error: 'date, outillage, prixGarage requis' })
    }
    const created = (await db.outilMohamedEntry.create({
      data: {
        date: body.date,
        vehicule: (body.vehicule ?? '').trim(),
        outillage: body.outillage.trim(),
        prix_garage: body.prixGarage,
        prix_mohamed: typeof body.prixMohamed === 'number' ? body.prixMohamed : null,
      },
    })) as OutilMohamedRow
    return res.status(201).json(toMohamedDto(created))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/mohamed/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await db.outilMohamedEntry.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Entrée introuvable' })

    const body = req.body as {
      date?: string
      vehicule?: string
      outillage?: string
      prixGarage?: number
      prixMohamed?: number
    }
    const data: Record<string, unknown> = {}
    if (body.date !== undefined) data.date = body.date
    if (body.vehicule !== undefined) data.vehicule = body.vehicule.trim()
    if (body.outillage !== undefined) data.outillage = body.outillage.trim()
    if (body.prixGarage !== undefined) data.prix_garage = body.prixGarage
    if (body.prixMohamed !== undefined) data.prix_mohamed = body.prixMohamed

    const updated = (await db.outilMohamedEntry.update({ where: { id }, data })) as OutilMohamedRow
    return res.json(toMohamedDto(updated))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/mohamed/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await db.outilMohamedEntry.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Entrée introuvable' })
    await db.outilMohamedEntry.delete({ where: { id } })
    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/ahmed', authenticate(), async (_req, res) => {
  try {
    const rows = (await db.outilAhmedEntry.findMany({
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    })) as OutilAhmedRow[]
    return res.json(rows.map(toAhmedDto))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/ahmed', authenticate(), async (req, res) => {
  try {
    const body = req.body as {
      date?: string
      vehicule?: string
      typeTravaux?: string
      prixGarage?: number
      prixAhmed?: number
    }
    if (!body.date || typeof body.prixAhmed !== 'number') {
      return res.status(400).json({ error: 'date et prixAhmed requis' })
    }
    const created = (await db.outilAhmedEntry.create({
      data: {
        date: body.date,
        vehicule: (body.vehicule ?? '').trim(),
        type_travaux: (body.typeTravaux ?? '').trim(),
        prix_garage: typeof body.prixGarage === 'number' ? body.prixGarage : null,
        prix_ahmed: body.prixAhmed,
      },
    })) as OutilAhmedRow
    return res.status(201).json(toAhmedDto(created))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/ahmed/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await db.outilAhmedEntry.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Entrée introuvable' })

    const body = req.body as {
      date?: string
      vehicule?: string
      typeTravaux?: string
      prixGarage?: number
      prixAhmed?: number
    }
    const data: Record<string, unknown> = {}
    if (body.date !== undefined) data.date = body.date
    if (body.vehicule !== undefined) data.vehicule = body.vehicule.trim()
    if (body.typeTravaux !== undefined) data.type_travaux = body.typeTravaux.trim()
    if (body.prixGarage !== undefined) data.prix_garage = body.prixGarage
    if (body.prixAhmed !== undefined) data.prix_ahmed = body.prixAhmed

    const updated = (await db.outilAhmedEntry.update({ where: { id }, data })) as OutilAhmedRow
    return res.json(toAhmedDto(updated))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/ahmed/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await db.outilAhmedEntry.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Entrée introuvable' })
    await db.outilAhmedEntry.delete({ where: { id } })
    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

