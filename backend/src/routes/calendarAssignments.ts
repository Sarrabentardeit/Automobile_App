import { Router } from 'express'
import type { Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'

const router = Router()
const db = prisma as any

/** prevu = blanc/gris · honore = vert · annule = rouge · non_honore = bleu */
export const RDV_STATUTS = ['prevu', 'honore', 'annule', 'non_honore'] as const
export type RdvStatut = (typeof RDV_STATUTS)[number]

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

function normalizeStatut(raw: unknown): RdvStatut {
  const s = String(raw ?? 'prevu').trim().toLowerCase()
  return (RDV_STATUTS as readonly string[]).includes(s) ? (s as RdvStatut) : 'prevu'
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
  statut?: string | null
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
    statut: normalizeStatut(r.statut),
  }
}

async function findUserIdByMemberName(memberName: string): Promise<number | null> {
  const name = memberName.trim()
  if (!name) return null
  const users = await db.user.findMany({
    select: { id: true, fullName: true },
  })
  const lower = name.toLowerCase()
  const exact = (users as Array<{ id: number; fullName: string }>).find(
    u => (u.fullName || '').trim().toLowerCase() === lower
  )
  if (exact) return exact.id
  const partial = (users as Array<{ id: number; fullName: string }>).find(u => {
    const n = (u.fullName || '').trim().toLowerCase()
    return n.includes(lower) || lower.includes(n)
  })
  return partial?.id ?? null
}

async function ensureClient(opts: { name: string; telephone: string }) {
  const telephone = opts.telephone.trim()
  const name = opts.name.trim()
  if (!telephone && !name) return
  try {
    if (telephone) {
      const existing = await db.client.findFirst({
        where: { telephone },
      })
      if (existing) {
        if (name && !existing.nom) {
          await db.client.update({ where: { id: existing.id }, data: { nom: name } })
        }
        return
      }
    } else if (name) {
      const existingByName = await db.client.findFirst({
        where: { nom: { equals: name, mode: 'insensitive' } },
      })
      if (existingByName) return
    }
    await db.client.create({
      data: {
        nom: name || 'Client RDV',
        telephone: telephone || '',
        email: '',
        adresse: '',
        notes: 'Créé depuis calendrier RDV',
      },
    })
  } catch {
    // client creation optional — don't fail RDV flow
  }
}

/** Crée un véhicule atelier à partir du RDV (si pas déjà lié). */
async function createVehiculeFromRdv(
  row: CalendarAssignmentRow,
  actorUserId: number | null
): Promise<{ id: number; modele: string; immatriculation: string } | null> {
  if (row.vehicle_id) {
    const existing = await db.vehicule.findUnique({ where: { id: row.vehicle_id } })
    if (existing) {
      return {
        id: existing.id,
        modele: existing.modele,
        immatriculation: existing.immatriculation,
      }
    }
  }

  const techId = await findUserIdByMemberName(row.member_name)
  const techIds = techId ? [techId] : []
  const notesMeta =
    techIds.length > 0
      ? `[[ASSIGNEES:${JSON.stringify({ technicien_ids: techIds, responsable_ids: [] })}]]`
      : ''
  const now = new Date().toISOString()
  const modele = (row.vehicle_label || '').trim() || 'Véhicule RDV'
  const telephone = (row.client_telephone || '').trim()
  const defaut = (row.description || '').trim()
  const clientNote = [row.client_name, telephone].filter(Boolean).join(' · ')
  const notesBase = [clientNote ? `Client: ${clientNote}` : '', 'Créé depuis RDV honoré']
    .filter(Boolean)
    .join('\n')
  const notes = notesMeta ? `${notesBase}\n\n${notesMeta}` : notesBase

  // Client déjà créé à l'enregistrement du RDV (tout statut) ; on renforce au cas où
  await ensureClient({
    name: row.client_name || '',
    telephone,
  })

  const v = await db.vehicule.create({
    data: {
      immatriculation: '',
      modele,
      type: 'voiture',
      etat_actuel: 'orange',
      service_type: 'autre',
      technicien_id: techId,
      responsable_id: null,
      defaut,
      client_telephone: telephone,
      date_entree: row.date,
      date_sortie: null,
      notes,
      derniere_mise_a_jour: now,
    },
  })

  if (actorUserId) {
    try {
      await db.vehiculeHistorique.create({
        data: {
          vehiculeId: v.id,
          etat_precedent: null,
          etat_nouveau: 'orange',
          date_changement: now,
          utilisateur_id: actorUserId,
          commentaire: 'Créé automatiquement — RDV honoré',
          duree_etat_precedent_min: null,
        },
      })
    } catch {
      // historique optional
    }
  }

  return { id: v.id, modele: v.modele, immatriculation: v.immatriculation }
}

// GET /calendar-assignments
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

// POST /calendar-assignments
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
      statut?: string
    }

    if (!body.date?.trim()) return res.status(400).json({ error: 'date est requise' })
    if (!body.memberName?.trim()) return res.status(400).json({ error: 'memberName est requis' })

    let statut = normalizeStatut(body.statut)
    let vehicleId = body.vehicleId ?? null
    let vehicleLabel = (body.vehicleLabel ?? '').trim() || 'Véhicule'

    const baseData = {
      date: body.date.trim(),
      member_name: body.memberName.trim(),
      vehicle_id: vehicleId,
      vehicle_label: vehicleLabel,
      description: (body.description ?? '').trim(),
      client_name: (body.clientName ?? '').trim() || null,
      client_telephone: (body.clientTelephone ?? '').trim() || null,
      statut,
    }

    let created = (await prisma.calendarAssignment.create({
      data: baseData,
    })) as CalendarAssignmentRow

    // Client : dès l'enregistrement, quel que soit le statut (prévu / honoré / non honoré / annulé)
    await ensureClient({
      name: created.client_name || '',
      telephone: created.client_telephone || '',
    })

    // Véhicule atelier : uniquement si honoré
    if (statut === 'honore') {
      const veh = await createVehiculeFromRdv(created, req.user?.sub ?? null)
      if (veh) {
        created = (await prisma.calendarAssignment.update({
          where: { id: created.id },
          data: {
            vehicle_id: veh.id,
            vehicle_label: veh.modele || vehicleLabel,
            statut: 'honore',
          },
        })) as CalendarAssignmentRow
      }
    }

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

// PUT /calendar-assignments/:id
router.put('/:id', authenticate(), async (req: AuthRequest, res) => {
  try {
    if (denyIfTechnicien(req, res)) return

    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })

    const existing = (await prisma.calendarAssignment.findUnique({
      where: { id },
    })) as CalendarAssignmentRow | null
    if (!existing) return res.status(404).json({ error: 'Affectation introuvable' })

    const body = req.body as {
      date?: string
      memberName?: string
      vehicleId?: number | null
      vehicleLabel?: string
      description?: string
      clientName?: string
      clientTelephone?: string
      statut?: string
    }

    if (body.memberName !== undefined && !body.memberName.trim()) {
      return res.status(400).json({ error: 'memberName ne peut pas être vide' })
    }
    if (body.date !== undefined && !body.date.trim()) {
      return res.status(400).json({ error: 'date ne peut pas être vide' })
    }

    const nextStatut =
      body.statut !== undefined ? normalizeStatut(body.statut) : normalizeStatut(existing.statut)

    const data: Record<string, unknown> = {
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
      ...(body.statut !== undefined && { statut: nextStatut }),
    }

    let updated = (await prisma.calendarAssignment.update({
      where: { id },
      data,
    })) as CalendarAssignmentRow

    // Client : à chaque enregistrement, indépendamment du statut
    await ensureClient({
      name: updated.client_name || '',
      telephone: updated.client_telephone || '',
    })

    // Passage à "honoré" → créer véhicule auto (sans supprimer le RDV)
    if (nextStatut === 'honore' && normalizeStatut(existing.statut) !== 'honore') {
      const veh = await createVehiculeFromRdv(updated, req.user?.sub ?? null)
      if (veh) {
        updated = (await prisma.calendarAssignment.update({
          where: { id },
          data: {
            vehicle_id: veh.id,
            vehicle_label: veh.modele || updated.vehicle_label,
            statut: 'honore',
          },
        })) as CalendarAssignmentRow
      }
    }

    return res.json(toAssignment(updated))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /calendar-assignments/:id — réservé ; préférer statut "annule"
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
