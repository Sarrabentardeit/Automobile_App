import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()
const db = prisma as any

const STATUTS = ['en_attente', 'envoye', 'accepte', 'refuse'] as const

type DemandeDevisRow = {
  id: number
  date: string
  client_name: string
  client_telephone: string | null
  vehicle_ref: string
  description: string
  statut: string
  montant_estime: number | null
  date_limite: string | null
  notes: string | null
}

function toDemandeDevis(d: DemandeDevisRow) {
  return {
    id: d.id,
    date: d.date,
    clientName: d.client_name,
    clientTelephone: d.client_telephone ?? undefined,
    vehicleRef: d.vehicle_ref,
    description: d.description,
    statut: d.statut as (typeof STATUTS)[number],
    montantEstime: d.montant_estime ?? undefined,
    dateLimite: d.date_limite ?? undefined,
    notes: d.notes ?? undefined,
  }
}

// GET /demandes-devis - liste avec recherche et filtre statut
router.get('/', authenticate(), async (req, res) => {
  try {
    const q = (req.query.q as string)?.trim()
    const statut = (req.query.statut as string)?.trim()

    const where: Record<string, unknown> = {}
    if (q) {
      where.OR = [
        { client_name: { contains: q, mode: 'insensitive' as const } },
        { client_telephone: { contains: q } },
        { vehicle_ref: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
      ]
    }
    if (statut && STATUTS.includes(statut as (typeof STATUTS)[number])) {
      where.statut = statut
    }

    const list = (await db.demandeDevis.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    })) as DemandeDevisRow[]

    return res.json(list.map(toDemandeDevis))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /demandes-devis/:id - détail
router.get('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const d = (await db.demandeDevis.findUnique({ where: { id } })) as DemandeDevisRow | null
    if (!d) return res.status(404).json({ error: 'Demande introuvable' })
    return res.json(toDemandeDevis(d))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /demandes-devis - créer
router.post('/', authenticate(), async (req, res) => {
  try {
    const body = req.body as {
      date?: string
      clientName?: string
      clientTelephone?: string
      vehicleRef?: string
      description?: string
      statut?: string
      montantEstime?: number
      dateLimite?: string
      notes?: string
    }

    if (!body.date?.trim()) {
      return res.status(400).json({ error: 'date est requise' })
    }
    if (!body.clientName?.trim()) {
      return res.status(400).json({ error: 'clientName est requis' })
    }
    if (!body.description?.trim()) {
      return res.status(400).json({ error: 'description est requise' })
    }

    const statut = body.statut && STATUTS.includes(body.statut as (typeof STATUTS)[number])
      ? body.statut
      : 'en_attente'

    const created = (await db.demandeDevis.create({
      data: {
        date: body.date.trim(),
        client_name: body.clientName.trim(),
        client_telephone: (body.clientTelephone ?? '').trim() || null,
        vehicle_ref: (body.vehicleRef ?? '').trim() || '',
        description: body.description.trim(),
        statut,
        montant_estime: body.montantEstime != null ? Number(body.montantEstime) : null,
        date_limite: (body.dateLimite ?? '').trim() || null,
        notes: (body.notes ?? '').trim() || null,
      },
    })) as DemandeDevisRow

    return res.status(201).json(toDemandeDevis(created))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /demandes-devis/:id - mise à jour
router.put('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })

    const body = req.body as {
      date?: string
      clientName?: string
      clientTelephone?: string
      vehicleRef?: string
      description?: string
      statut?: string
      montantEstime?: number
      dateLimite?: string
      notes?: string
    }

    const existing = await db.demandeDevis.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Demande introuvable' })

    if (body.date !== undefined && !body.date.trim()) {
      return res.status(400).json({ error: 'date ne peut pas être vide' })
    }
    if (body.clientName !== undefined && !body.clientName.trim()) {
      return res.status(400).json({ error: 'clientName ne peut pas être vide' })
    }
    if (body.description !== undefined && !body.description.trim()) {
      return res.status(400).json({ error: 'description ne peut pas être vide' })
    }

    const statut = body.statut && STATUTS.includes(body.statut as (typeof STATUTS)[number])
      ? body.statut
      : undefined

    const updated = (await db.demandeDevis.update({
      where: { id },
      data: {
        ...(body.date !== undefined && { date: body.date.trim() }),
        ...(body.clientName !== undefined && { client_name: body.clientName.trim() }),
        ...(body.clientTelephone !== undefined && { client_telephone: (body.clientTelephone ?? '').trim() || null }),
        ...(body.vehicleRef !== undefined && { vehicle_ref: (body.vehicleRef ?? '').trim() || '' }),
        ...(body.description !== undefined && { description: body.description.trim() }),
        ...(statut !== undefined && { statut }),
        ...(body.montantEstime !== undefined && { montant_estime: body.montantEstime != null ? Number(body.montantEstime) : null }),
        ...(body.dateLimite !== undefined && { date_limite: (body.dateLimite ?? '').trim() || null }),
        ...(body.notes !== undefined && { notes: (body.notes ?? '').trim() || null }),
      },
    })) as DemandeDevisRow

    return res.json(toDemandeDevis(updated))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /demandes-devis/:id - suppression
router.delete('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await db.demandeDevis.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Demande introuvable' })
    await db.demandeDevis.delete({ where: { id } })
    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
