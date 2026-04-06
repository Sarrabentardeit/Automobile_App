import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import { totalTTCAchat } from '../lib/achatTotals'

const router = Router()
const db = prisma as any

type FournisseurRow = {
  id: number
  nom: string
  telephone: string
  email: string | null
  adresse: string | null
  contact: string | null
  notes: string | null
}

function toFournisseur(f: FournisseurRow) {
  return {
    id: f.id,
    nom: f.nom,
    telephone: f.telephone,
    email: f.email ?? undefined,
    adresse: f.adresse ?? undefined,
    contact: f.contact ?? undefined,
    notes: f.notes ?? undefined,
  }
}

// GET /fournisseurs - liste avec recherche
router.get('/', authenticate(), async (req, res) => {
  try {
    const q = (req.query.q as string)?.trim()
    const where =
      q && q.length
        ? {
            OR: [
              { nom: { contains: q, mode: 'insensitive' as const } },
              { telephone: { contains: q, mode: 'insensitive' as const } },
              { email: { contains: q, mode: 'insensitive' as const } },
              { contact: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : undefined

    const list = (await db.fournisseur.findMany({
      where,
      orderBy: { nom: 'asc' },
    })) as FournisseurRow[]

    return res.json(list.map(toFournisseur))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /fournisseurs/top - top fournisseurs par montant total achats
router.get('/top', authenticate(), async (req, res) => {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit as string, 10) || 5))
    const achats = (await db.achat.findMany({
      where: { fournisseur_id: { not: null } },
      include: { lignes: true },
    })) as {
      fournisseur_id: number | null
      fournisseur_nom: string
      timbre: number
      lignes: { quantite: number; prix_unitaire: number }[]
    }[]

    const byFournisseur = new Map<number, { nom: string; total: number }>()
    for (const a of achats) {
      if (a.fournisseur_id == null) continue
      const total = totalTTCAchat(
        a.lignes.map(l => ({ quantite: l.quantite, prix_unitaire: l.prix_unitaire })),
        a.timbre ?? 1
      )
      const cur = byFournisseur.get(a.fournisseur_id)
      if (cur) {
        cur.total += total
      } else {
        byFournisseur.set(a.fournisseur_id, { nom: a.fournisseur_nom, total })
      }
    }
    const top = [...byFournisseur.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, limit)
      .map(([id, { nom, total }]) => ({ fournisseurId: id, nom, total }))

    return res.json(top)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /fournisseurs/:id/fiche - fiche fournisseur avec achats et stats
router.get('/:id/fiche', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const f = (await db.fournisseur.findUnique({ where: { id } })) as FournisseurRow | null
    if (!f) return res.status(404).json({ error: 'Fournisseur introuvable' })

    const achats = (await db.achat.findMany({
      where: { fournisseur_id: id },
      include: { lignes: true },
      orderBy: { date: 'desc' },
    })) as {
      id: number
      numero: string
      date: string
      timbre: number
      lignes: { quantite: number; prix_unitaire: number }[]
    }[]

    const totalCumule = achats.reduce((s, a) => {
      return (
        s +
        totalTTCAchat(
          a.lignes.map(l => ({ quantite: l.quantite, prix_unitaire: l.prix_unitaire })),
          a.timbre ?? 1
        )
      )
    }, 0)

    const dernierAchat = achats[0]
      ? {
          numero: achats[0].numero,
          date: achats[0].date,
          total: totalTTCAchat(
            achats[0].lignes.map(l => ({ quantite: l.quantite, prix_unitaire: l.prix_unitaire })),
            achats[0].timbre ?? 1
          ),
        }
      : null

    const historique = achats.slice(0, 50).map(a => ({
      id: a.id,
      numero: a.numero,
      date: a.date,
      total: totalTTCAchat(
        a.lignes.map(l => ({ quantite: l.quantite, prix_unitaire: l.prix_unitaire })),
        a.timbre ?? 1
      ),
    }))

    return res.json({
      fournisseur: toFournisseur(f),
      totalCumule,
      dernierAchat,
      historique,
      countAchats: achats.length,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /fournisseurs/:id - détail
router.get('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const f = (await db.fournisseur.findUnique({ where: { id } })) as FournisseurRow | null
    if (!f) return res.status(404).json({ error: 'Fournisseur introuvable' })
    return res.json(toFournisseur(f))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /fournisseurs - créer
router.post('/', authenticate(), async (req, res) => {
  try {
    const body = req.body as {
      nom?: string
      telephone?: string
      email?: string
      adresse?: string
      contact?: string
      notes?: string
    }

    if (!body.nom?.trim()) {
      return res.status(400).json({ error: 'nom est requis' })
    }
    if (!body.telephone?.trim()) {
      return res.status(400).json({ error: 'telephone est requis' })
    }

    const created = (await db.fournisseur.create({
      data: {
        nom: body.nom.trim(),
        telephone: body.telephone.trim(),
        email: (body.email ?? '').trim() || null,
        adresse: (body.adresse ?? '').trim() || null,
        contact: (body.contact ?? '').trim() || null,
        notes: (body.notes ?? '').trim() || null,
      },
    })) as FournisseurRow

    return res.status(201).json(toFournisseur(created))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /fournisseurs/:id - mise à jour
router.put('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })

    const body = req.body as {
      nom?: string
      telephone?: string
      email?: string
      adresse?: string
      contact?: string
      notes?: string
    }

    const existing = await db.fournisseur.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Fournisseur introuvable' })

    if (body.nom !== undefined && !body.nom.trim()) {
      return res.status(400).json({ error: 'nom ne peut pas être vide' })
    }
    if (body.telephone !== undefined && !body.telephone.trim()) {
      return res.status(400).json({ error: 'telephone ne peut pas être vide' })
    }

    const updated = (await db.fournisseur.update({
      where: { id },
      data: {
        ...(body.nom !== undefined && { nom: body.nom.trim() }),
        ...(body.telephone !== undefined && { telephone: body.telephone.trim() }),
        ...(body.email !== undefined && { email: (body.email ?? '').trim() || null }),
        ...(body.adresse !== undefined && { adresse: (body.adresse ?? '').trim() || null }),
        ...(body.contact !== undefined && { contact: (body.contact ?? '').trim() || null }),
        ...(body.notes !== undefined && { notes: (body.notes ?? '').trim() || null }),
      },
    })) as FournisseurRow

    return res.json(toFournisseur(updated))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /fournisseurs/:id - suppression
router.delete('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await db.fournisseur.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Fournisseur introuvable' })
    await db.fournisseur.delete({ where: { id } })
    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

