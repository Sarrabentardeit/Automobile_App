import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'

const router = Router()
const db = prisma as any

const TYPES = ['achat', 'revenue', 'paiement'] as const
type TransactionType = (typeof TYPES)[number]

type TransactionRow = {
  id: number
  type: string
  date: string
  montant: number
  fournisseur: string
  vehicule: string | null
  pieces: string | null
  num_facture: string | null
}

function toDto(row: TransactionRow) {
  return {
    id: row.id,
    type: TYPES.includes(row.type as TransactionType) ? row.type : 'achat',
    date: row.date,
    montant: row.montant,
    fournisseur: row.fournisseur,
    vehicule: row.vehicule ?? undefined,
    pieces: row.pieces ?? undefined,
    numFacture: row.num_facture ?? undefined,
  }
}

router.get('/', authenticate(), async (_req, res) => {
  try {
    const list = (await db.fournisseurTransaction.findMany({
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    })) as TransactionRow[]

    return res.json(list.map(toDto))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', authenticate(), async (req: AuthRequest, res) => {
  try {
    const body = req.body as {
      type?: string
      date?: string
      montant?: number
      fournisseur?: string
      vehicule?: string
      pieces?: string
      numFacture?: string
    }

    if (!body.date) return res.status(400).json({ error: 'date est requise' })
    if (typeof body.montant !== 'number' || Number.isNaN(body.montant)) {
      return res.status(400).json({ error: 'montant invalide' })
    }
    if (!body.fournisseur?.trim()) {
      return res.status(400).json({ error: 'fournisseur est requis' })
    }

    const type = TYPES.includes(body.type as TransactionType) ? body.type : 'achat'
    const created = (await db.fournisseurTransaction.create({
      data: {
        type,
        date: body.date,
        montant: body.montant,
        fournisseur: body.fournisseur.trim(),
        vehicule: (body.vehicule ?? '').trim() || null,
        pieces: (body.pieces ?? '').trim() || null,
        num_facture: (body.numFacture ?? '').trim() || null,
        created_by_id: req.user?.sub ?? null,
        created_by_name: req.user?.fullName ?? null,
      },
    })) as TransactionRow

    return res.status(201).json(toDto(created))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' })

    const body = req.body as {
      type?: string
      date?: string
      montant?: number
      fournisseur?: string
      vehicule?: string
      pieces?: string
      numFacture?: string
    }

    const existing = (await db.fournisseurTransaction.findUnique({ where: { id } })) as TransactionRow | null
    if (!existing) return res.status(404).json({ error: 'Transaction introuvable' })

    const data: Record<string, unknown> = {}
    if (body.type !== undefined) {
      if (!TYPES.includes(body.type as TransactionType)) {
        return res.status(400).json({ error: 'type invalide' })
      }
      data.type = body.type
    }
    if (body.date !== undefined) data.date = body.date
    if (body.montant !== undefined) {
      if (typeof body.montant !== 'number' || Number.isNaN(body.montant)) {
        return res.status(400).json({ error: 'montant invalide' })
      }
      data.montant = body.montant
    }
    if (body.fournisseur !== undefined) {
      if (!body.fournisseur.trim()) {
        return res.status(400).json({ error: 'fournisseur est requis' })
      }
      data.fournisseur = body.fournisseur.trim()
    }
    if (body.vehicule !== undefined) data.vehicule = body.vehicule.trim() || null
    if (body.pieces !== undefined) data.pieces = body.pieces.trim() || null
    if (body.numFacture !== undefined) data.num_facture = body.numFacture.trim() || null

    const updated = (await db.fournisseurTransaction.update({
      where: { id },
      data,
    })) as TransactionRow

    return res.json(toDto(updated))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await db.fournisseurTransaction.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Transaction introuvable' })
    await db.fournisseurTransaction.delete({ where: { id } })
    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

