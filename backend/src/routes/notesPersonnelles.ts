import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'

const router = Router()
const db = prisma as any

const COULEURS = new Set(['', 'amber', 'sky', 'emerald', 'rose'])

function toNote(n: {
  id: number
  userId: number
  titre: string
  contenu: string
  rappelAt: Date | null
  couleur?: string | null
  epinglee: boolean
  faite: boolean
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: n.id,
    userId: n.userId,
    titre: n.titre,
    contenu: n.contenu,
    rappelAt: n.rappelAt ? n.rappelAt.toISOString() : null,
    couleur: n.couleur || '',
    epinglee: n.epinglee,
    faite: n.faite,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }
}

function parseRappelAt(raw: unknown): Date | null | undefined {
  if (raw === undefined) return undefined
  if (raw === null || raw === '') return null
  if (typeof raw !== 'string') return undefined
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return undefined
  return d
}

function parseCouleur(raw: unknown): string | undefined {
  if (raw === undefined) return undefined
  const v = typeof raw === 'string' ? raw.trim() : ''
  if (!COULEURS.has(v)) return undefined
  return v
}

// GET /notes-personnelles
router.get('/', authenticate(), async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.sub
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const q = (req.query.q as string)?.trim()
    const where: Record<string, unknown> = { userId }
    if (q) {
      where.OR = [
        { titre: { contains: q, mode: 'insensitive' } },
        { contenu: { contains: q, mode: 'insensitive' } },
      ]
    }

    const list = await db.notePersonnelle.findMany({
      where,
      orderBy: [{ epinglee: 'desc' }, { updatedAt: 'desc' }],
    })

    return res.json(list.map(toNote))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /notes-personnelles
router.post('/', authenticate(), async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.sub
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const body = req.body as {
      titre?: string
      contenu?: string
      rappelAt?: string | null
      couleur?: string
      epinglee?: boolean
      faite?: boolean
    }

    const titre = (body.titre ?? '').trim()
    const contenu = (body.contenu ?? '').trim()
    if (!titre && !contenu) {
      return res.status(400).json({ error: 'Titre ou contenu requis' })
    }

    const rappelAt = parseRappelAt(body.rappelAt)
    if (body.rappelAt !== undefined && rappelAt === undefined) {
      return res.status(400).json({ error: 'rappelAt invalide' })
    }

    const couleur = parseCouleur(body.couleur)
    if (body.couleur !== undefined && couleur === undefined) {
      return res.status(400).json({ error: 'couleur invalide' })
    }

    const created = await db.notePersonnelle.create({
      data: {
        userId,
        titre,
        contenu,
        rappelAt: rappelAt === undefined ? null : rappelAt,
        couleur: couleur ?? '',
        epinglee: Boolean(body.epinglee),
        faite: Boolean(body.faite),
        rappelNotifieAt: null,
      },
    })

    return res.status(201).json(toNote(created))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /notes-personnelles/:id
router.put('/:id', authenticate(), async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.sub
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID invalide' })

    const existing = await db.notePersonnelle.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Note introuvable' })
    }

    const body = req.body as {
      titre?: string
      contenu?: string
      rappelAt?: string | null
      couleur?: string
      epinglee?: boolean
      faite?: boolean
    }

    const data: Record<string, unknown> = {}
    if (body.titre !== undefined) data.titre = body.titre.trim()
    if (body.contenu !== undefined) data.contenu = body.contenu.trim()
    if (body.epinglee !== undefined) data.epinglee = Boolean(body.epinglee)
    if (body.faite !== undefined) data.faite = Boolean(body.faite)
    if (body.rappelAt !== undefined) {
      const rappelAt = parseRappelAt(body.rappelAt)
      if (rappelAt === undefined) return res.status(400).json({ error: 'rappelAt invalide' })
      data.rappelAt = rappelAt
      // Nouveau / modifié → autoriser une nouvelle notif
      data.rappelNotifieAt = null
    }
    if (body.couleur !== undefined) {
      const couleur = parseCouleur(body.couleur)
      if (couleur === undefined) return res.status(400).json({ error: 'couleur invalide' })
      data.couleur = couleur
    }

    if (
      (data.titre !== undefined || data.contenu !== undefined) &&
      !(String(data.titre ?? existing.titre).trim() || String(data.contenu ?? existing.contenu).trim())
    ) {
      return res.status(400).json({ error: 'Titre ou contenu requis' })
    }

    const updated = await db.notePersonnelle.update({ where: { id }, data })
    return res.json(toNote(updated))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /notes-personnelles/:id
router.delete('/:id', authenticate(), async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.sub
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID invalide' })

    const existing = await db.notePersonnelle.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Note introuvable' })
    }

    await db.notePersonnelle.delete({ where: { id } })
    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
