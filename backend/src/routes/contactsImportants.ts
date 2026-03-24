import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()
const db = prisma as any

function toContact(c: {
  id: number
  nom: string
  numero: string
  categorie: string | null
  notes: string | null
}) {
  return {
    id: c.id,
    nom: c.nom,
    numero: c.numero,
    categorie: c.categorie ?? undefined,
    notes: c.notes ?? undefined,
  }
}

// GET /contacts-importants - liste avec recherche et filtre catégorie
router.get('/', authenticate(), async (req, res) => {
  try {
    const q = (req.query.q as string)?.trim()
    const categorie = (req.query.categorie as string)?.trim()

    const where: Record<string, unknown> = {}
    if (q) {
      where.OR = [
        { nom: { contains: q, mode: 'insensitive' } },
        { numero: { contains: q } },
        { categorie: { contains: q, mode: 'insensitive' } },
      ]
    }
    if (categorie) {
      where.categorie = { equals: categorie, mode: 'insensitive' }
    }

    const list = await db.contactImportant.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { nom: 'asc' },
    })

    return res.json(list.map(toContact))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /contacts-importants/:id - détail
router.get('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const c = await db.contactImportant.findUnique({ where: { id } })
    if (!c) return res.status(404).json({ error: 'Contact introuvable' })
    return res.json(toContact(c))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /contacts-importants - créer
router.post('/', authenticate(), async (req, res) => {
  try {
    const body = req.body as { nom?: string; numero?: string; categorie?: string; notes?: string }

    if (!body.nom?.trim()) {
      return res.status(400).json({ error: 'nom est requis' })
    }
    if (!body.numero?.trim()) {
      return res.status(400).json({ error: 'numero est requis' })
    }

    const created = await db.contactImportant.create({
      data: {
        nom: body.nom.trim(),
        numero: body.numero.trim(),
        categorie: (body.categorie ?? '').trim() || null,
        notes: (body.notes ?? '').trim() || null,
      },
    })

    return res.status(201).json(toContact(created))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /contacts-importants/:id - mise à jour
router.put('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })

    const body = req.body as { nom?: string; numero?: string; categorie?: string; notes?: string }

    const existing = await db.contactImportant.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Contact introuvable' })

    if (body.nom !== undefined && !body.nom.trim()) {
      return res.status(400).json({ error: 'nom ne peut pas être vide' })
    }
    if (body.numero !== undefined && !body.numero.trim()) {
      return res.status(400).json({ error: 'numero ne peut pas être vide' })
    }

    const updated = await db.contactImportant.update({
      where: { id },
      data: {
        ...(body.nom !== undefined && { nom: body.nom.trim() }),
        ...(body.numero !== undefined && { numero: body.numero.trim() }),
        ...(body.categorie !== undefined && { categorie: (body.categorie ?? '').trim() || null }),
        ...(body.notes !== undefined && { notes: (body.notes ?? '').trim() || null }),
      },
    })

    return res.json(toContact(updated))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /contacts-importants/:id - suppression
router.delete('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await db.contactImportant.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Contact introuvable' })
    await db.contactImportant.delete({ where: { id } })
    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
