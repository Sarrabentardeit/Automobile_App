import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()

const TYPES = ['moteur', 'boite', 'liquide_refroidissement', 'hydraulique', 'autre'] as const

type ProduitHuileRow = {
  id: number
  designation: string
  reference: string
  type: string
  quantite: number
  unite: string
  seuil_alerte: number | null
  prix: number | null
}

function toHuileProduct(r: ProduitHuileRow) {
  return {
    id: r.id,
    designation: r.designation,
    reference: r.reference,
    type: r.type as (typeof TYPES)[number],
    quantite: r.quantite,
    unite: r.unite,
    seuilAlerte: r.seuil_alerte ?? undefined,
    prix: r.prix ?? undefined,
  }
}

// GET /huiles - liste avec recherche et filtre type
router.get('/', authenticate(), async (req, res) => {
  try {
    const q = (req.query.q as string)?.trim()
    const type = (req.query.type as string)?.trim()

    const where: Record<string, unknown> = {}
    if (q) {
      where.OR = [
        { designation: { contains: q, mode: 'insensitive' as const } },
        { reference: { contains: q, mode: 'insensitive' as const } },
      ]
    }
    if (type && TYPES.includes(type as (typeof TYPES)[number])) {
      where.type = type
    }

    const list = (await prisma.produitHuile.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: [{ designation: 'asc' }],
    })) as ProduitHuileRow[]

    return res.json(list.map(toHuileProduct))
  } catch (err) {
    console.error(err)
    if (typeof (prisma as any).produitHuile === 'undefined') {
      return res.status(500).json({
        error: 'Backend: exécutez "npx prisma generate" puis redémarrez le serveur.',
      })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /huiles/:id - détail
router.get('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const r = (await prisma.produitHuile.findUnique({ where: { id } })) as ProduitHuileRow | null
    if (!r) return res.status(404).json({ error: 'Produit huile introuvable' })
    return res.json(toHuileProduct(r))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /huiles - créer
router.post('/', authenticate(), async (req, res) => {
  try {
    const body = req.body as {
      designation?: string
      reference?: string
      type?: string
      quantite?: number
      unite?: string
      seuilAlerte?: number
      prix?: number
    }

    if (!body.designation?.trim()) {
      return res.status(400).json({ error: 'designation est requise' })
    }

    const type = body.type && TYPES.includes(body.type as (typeof TYPES)[number]) ? body.type : 'moteur'
    const quantite = typeof body.quantite === 'number' ? Math.max(0, body.quantite) : 0
    const unite = (body.unite ?? 'L').toString().trim() || 'L'

    const created = (await prisma.produitHuile.create({
      data: {
        designation: body.designation.trim(),
        reference: (body.reference ?? '').toString().trim(),
        type,
        quantite,
        unite,
        seuil_alerte: body.seuilAlerte != null ? body.seuilAlerte : null,
        prix: body.prix != null ? body.prix : null,
      },
    })) as ProduitHuileRow

    return res.status(201).json(toHuileProduct(created))
  } catch (err) {
    console.error(err)
    if (typeof (prisma as any).produitHuile === 'undefined') {
      return res.status(500).json({
        error: 'Backend: exécutez "npx prisma generate" puis redémarrez le serveur.',
      })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /huiles/:id - mise à jour
router.put('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })

    const existing = await prisma.produitHuile.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Produit huile introuvable' })

    const body = req.body as {
      designation?: string
      reference?: string
      type?: string
      quantite?: number
      unite?: string
      seuilAlerte?: number
      prix?: number
    }

    if (body.designation !== undefined && !body.designation.trim()) {
      return res.status(400).json({ error: 'designation ne peut pas être vide' })
    }

    const type = body.type && TYPES.includes(body.type as (typeof TYPES)[number]) ? body.type : undefined
    const quantite = body.quantite !== undefined ? Math.max(0, body.quantite) : undefined
    const unite = body.unite !== undefined ? (body.unite.toString().trim() || 'L') : undefined

    const updated = (await prisma.produitHuile.update({
      where: { id },
      data: {
        ...(body.designation !== undefined && { designation: body.designation.trim() }),
        ...(body.reference !== undefined && { reference: body.reference.toString().trim() }),
        ...(type !== undefined && { type }),
        ...(quantite !== undefined && { quantite }),
        ...(unite !== undefined && { unite }),
        ...(body.seuilAlerte !== undefined && { seuil_alerte: body.seuilAlerte }),
        ...(body.prix !== undefined && { prix: body.prix }),
      },
    })) as ProduitHuileRow

    return res.json(toHuileProduct(updated))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /huiles/:id - suppression
router.delete('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await prisma.produitHuile.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Produit huile introuvable' })
    await prisma.produitHuile.delete({ where: { id } })
    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
