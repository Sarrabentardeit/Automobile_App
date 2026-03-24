import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()
const db = prisma as any

// Vérifier que le modèle ClientDette existe (client Prisma régénéré après migration)
if (typeof (db as any).clientDette === 'undefined') {
  console.error(
    '[clientsDettes] Le modèle Prisma ClientDette est absent. Exécutez "npx prisma generate" (avec le serveur backend arrêté), puis redémarrez le serveur.'
  )
}

type ClientDetteRow = {
  id: number
  client_name: string
  telephone_client: string
  designation: string
  reste: number
  notes: string | null
}

function toClientAvecDette(c: ClientDetteRow) {
  return {
    id: c.id,
    clientName: c.client_name,
    telephoneClient: c.telephone_client,
    designation: c.designation,
    reste: c.reste,
    notes: c.notes ?? undefined,
  }
}

// GET /clients-dettes - liste avec recherche
router.get('/', authenticate(), async (req, res) => {
  try {
    const q = (req.query.q as string)?.trim()

    const where = q
      ? {
          OR: [
            { client_name: { contains: q, mode: 'insensitive' as const } },
            { telephone_client: { contains: q, mode: 'insensitive' as const } },
            { designation: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : undefined

    const list = (await db.clientDette.findMany({
      where,
      orderBy: [{ reste: 'desc' }, { id: 'desc' }],
    })) as ClientDetteRow[]

    return res.json(list.map(toClientAvecDette))
  } catch (err) {
    console.error(err)
    const message =
      (db as any).clientDette === undefined
        ? 'Backend: exécutez "npx prisma generate" puis redémarrez le serveur.'
        : err instanceof Error ? err.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
})

// GET /clients-dettes/:id - détail
router.get('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const c = (await db.clientDette.findUnique({ where: { id } })) as ClientDetteRow | null
    if (!c) return res.status(404).json({ error: 'Client avec dette introuvable' })
    return res.json(toClientAvecDette(c))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /clients-dettes - créer
router.post('/', authenticate(), async (req, res) => {
  try {
    const body = req.body as {
      clientName?: string
      telephoneClient?: string
      designation?: string
      reste?: number
      notes?: string
    }

    if (!body.clientName?.trim()) {
      return res.status(400).json({ error: 'clientName est requis' })
    }

    const created = (await db.clientDette.create({
      data: {
        client_name: body.clientName.trim(),
        telephone_client: (body.telephoneClient ?? '').trim(),
        designation: (body.designation ?? '').trim(),
        reste: typeof body.reste === 'number' ? body.reste : Number(body.reste) || 0,
        notes: (body.notes ?? '').trim() || null,
      },
    })) as ClientDetteRow

    return res.status(201).json(toClientAvecDette(created))
  } catch (err) {
    console.error(err)
    const message =
      (db as any).clientDette === undefined
        ? 'Backend: exécutez "npx prisma generate" puis redémarrez le serveur.'
        : err instanceof Error ? err.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
})

// PUT /clients-dettes/:id - mise à jour
router.put('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })

    const body = req.body as {
      clientName?: string
      telephoneClient?: string
      designation?: string
      reste?: number
      notes?: string
    }

    const existing = await db.clientDette.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Client avec dette introuvable' })

    if (body.clientName !== undefined && !body.clientName.trim()) {
      return res.status(400).json({ error: 'clientName ne peut pas être vide' })
    }

    const updated = (await db.clientDette.update({
      where: { id },
      data: {
        ...(body.clientName !== undefined && { client_name: body.clientName.trim() }),
        ...(body.telephoneClient !== undefined && { telephone_client: (body.telephoneClient ?? '').trim() }),
        ...(body.designation !== undefined && { designation: (body.designation ?? '').trim() }),
        ...(body.reste !== undefined && { reste: typeof body.reste === 'number' ? body.reste : Number(body.reste) || 0 }),
        ...(body.notes !== undefined && { notes: (body.notes ?? '').trim() || null }),
      },
    })) as ClientDetteRow

    return res.json(toClientAvecDette(updated))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /clients-dettes/:id - suppression
router.delete('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await db.clientDette.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Client avec dette introuvable' })
    await db.clientDette.delete({ where: { id } })
    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
