import { Router } from 'express'
import type { Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'

const router = Router()

/** Seuls admin / responsable / financier gèrent les affectations ; les techniciens consultent leur planning uniquement */
function canManageAssignments(role: string | undefined) {
  return role !== 'technicien'
}

function denyIfTechnicien(req: AuthRequest, res: Response) {
  if (!canManageAssignments(req.user?.role)) {
    res.status(403).json({ error: 'Action réservée aux administrateurs et responsables' })
    return true
  }
  return false
}

type CalendarAssignmentRow = {
  id: number
  date: string
  member_name: string
  vehicle_id: number | null
  vehicle_label: string
  description: string
  client_name: string | null
  client_telephone: string | null
}

function toAssignment(r: CalendarAssignmentRow) {
  return {
    id: r.id,
    date: r.date,
    memberName: r.member_name,
    vehicleId: r.vehicle_id,
    vehicleLabel: r.vehicle_label,
    description: r.description,
    clientName: r.client_name || undefined,
    clientTelephone: r.client_telephone || undefined,
  }
}

// GET /calendar-assignments - liste (option: filtre année/mois)
router.get('/', authenticate(), async (req: AuthRequest, res) => {
  try {
    const year = req.query.year ? Number(req.query.year) : undefined
    const month = req.query.month ? Number(req.query.month) : undefined

    const where: Record<string, unknown> = {}

    if (year !== undefined && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
      return res.status(400).json({ error: 'year invalide' })
    }
    if (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) {
      return res.status(400).json({ error: 'month invalide' })
    }

    const effectiveYear = year ?? new Date().getFullYear()
    if (month !== undefined) {
      const start = `${effectiveYear}-${String(month).padStart(2, '0')}-01`
      const endDate = new Date(effectiveYear, month, 0).getDate()
      const end = `${effectiveYear}-${String(month).padStart(2, '0')}-${String(endDate).padStart(2, '0')}`
      where.date = { gte: start, lte: end }
    } else if (year !== undefined) {
      where.date = { gte: `${year}-01-01`, lte: `${year}-12-31` }
    }

    if (req.user?.role === 'technicien') {
      const name = req.user.fullName?.trim()
      if (!name) return res.json([])
      where.member_name = { equals: name, mode: 'insensitive' }
    }

    const list = (await prisma.calendarAssignment.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    })) as CalendarAssignmentRow[]

    return res.json(list.map(toAssignment))
  } catch (err) {
    console.error(err)
    if (typeof (prisma as any).calendarAssignment === 'undefined') {
      return res.status(500).json({
        error: 'Backend: exécutez "npx prisma generate" puis redémarrez le serveur.',
      })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /calendar-assignments - créer
router.post('/', authenticate(), async (req: AuthRequest, res) => {
  try {
    if (denyIfTechnicien(req, res)) return

    const body = req.body as {
      date?: string
      memberName?: string
      vehicleId?: number | null
      vehicleLabel?: string
      description?: string
      clientName?: string
      clientTelephone?: string
    }

    if (!body.date?.trim()) return res.status(400).json({ error: 'date est requise' })
    if (!body.memberName?.trim()) return res.status(400).json({ error: 'memberName est requis' })

    const created = (await prisma.calendarAssignment.create({
      data: {
        date: body.date.trim(),
        member_name: body.memberName.trim(),
        vehicle_id: body.vehicleId ?? null,
        vehicle_label: (body.vehicleLabel ?? '').trim() || 'Véhicule',
        description: (body.description ?? '').trim(),
        client_name: (body.clientName ?? '').trim() || null,
        client_telephone: (body.clientTelephone ?? '').trim() || null,
      },
    })) as CalendarAssignmentRow

    return res.status(201).json(toAssignment(created))
  } catch (err) {
    console.error(err)
    if (typeof (prisma as any).calendarAssignment === 'undefined') {
      return res.status(500).json({
        error: 'Backend: exécutez "npx prisma generate" puis redémarrez le serveur.',
      })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /calendar-assignments/:id - mise à jour
router.put('/:id', authenticate(), async (req: AuthRequest, res) => {
  try {
    if (denyIfTechnicien(req, res)) return

    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })

    const existing = await prisma.calendarAssignment.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Affectation introuvable' })

    const body = req.body as {
      date?: string
      memberName?: string
      vehicleId?: number | null
      vehicleLabel?: string
      description?: string
      clientName?: string
      clientTelephone?: string
    }

    if (body.memberName !== undefined && !body.memberName.trim()) {
      return res.status(400).json({ error: 'memberName ne peut pas être vide' })
    }
    if (body.date !== undefined && !body.date.trim()) {
      return res.status(400).json({ error: 'date ne peut pas être vide' })
    }

    const updated = (await prisma.calendarAssignment.update({
      where: { id },
      data: {
        ...(body.date !== undefined && { date: body.date.trim() }),
        ...(body.memberName !== undefined && { member_name: body.memberName.trim() }),
        ...(body.vehicleId !== undefined && { vehicle_id: body.vehicleId }),
        ...(body.vehicleLabel !== undefined && {
          vehicle_label: body.vehicleLabel.trim() || 'Véhicule',
        }),
        ...(body.description !== undefined && { description: body.description.trim() }),
        ...(body.clientName !== undefined && {
          client_name: (body.clientName ?? '').trim() || null,
        }),
        ...(body.clientTelephone !== undefined && {
          client_telephone: (body.clientTelephone ?? '').trim() || null,
        }),
      },
    })) as CalendarAssignmentRow

    return res.json(toAssignment(updated))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /calendar-assignments/:id - suppression
router.delete('/:id', authenticate(), async (req: AuthRequest, res) => {
  try {
    if (denyIfTechnicien(req, res)) return

    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await prisma.calendarAssignment.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Affectation introuvable' })
    await prisma.calendarAssignment.delete({ where: { id } })
    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

