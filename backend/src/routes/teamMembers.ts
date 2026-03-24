import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()

type TeamMemberRow = {
  id: number
  name: string
  phone: string
}

function toTeamMember(r: TeamMemberRow) {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
  }
}

// GET /team-members - liste
router.get('/', authenticate(), async (_req, res) => {
  try {
    const list = (await prisma.teamMember.findMany({
      orderBy: [{ name: 'asc' }],
    })) as TeamMemberRow[]
    return res.json(list.map(toTeamMember))
  } catch (err) {
    console.error(err)
    if (typeof (prisma as any).teamMember === 'undefined') {
      return res.status(500).json({
        error: 'Backend: exécutez "npx prisma generate" puis redémarrez le serveur.',
      })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /team-members - créer
router.post('/', authenticate(), async (req, res) => {
  try {
    const body = req.body as { name?: string; phone?: string }
    if (!body.name?.trim()) return res.status(400).json({ error: 'name est requis' })

    const created = (await prisma.teamMember.create({
      data: {
        name: body.name.trim(),
        phone: (body.phone ?? '').trim(),
      },
    })) as TeamMemberRow

    return res.status(201).json(toTeamMember(created))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /team-members/:id - mise à jour
router.put('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })

    const existing = await prisma.teamMember.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Membre introuvable' })

    const body = req.body as { name?: string; phone?: string }
    if (body.name !== undefined && !body.name.trim()) {
      return res.status(400).json({ error: 'name ne peut pas être vide' })
    }

    const updated = (await prisma.teamMember.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.phone !== undefined && { phone: body.phone.trim() }),
      },
    })) as TeamMemberRow

    return res.json(toTeamMember(updated))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /team-members/:id - suppression
router.delete('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await prisma.teamMember.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Membre introuvable' })
    await prisma.teamMember.delete({ where: { id } })
    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

