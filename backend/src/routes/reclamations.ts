import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'

const router = Router()
const db = prisma as any

// Vérifier que le modèle Reclamation existe (client Prisma régénéré après migration)
if (typeof (db as any).reclamation === 'undefined') {
  console.error(
    '[reclamations] Le modèle Prisma Reclamation est absent. Exécutez "npx prisma generate" (avec le serveur backend arrêté), puis redémarrez le serveur.'
  )
}

const STATUTS = ['ouverte', 'en_cours', 'traitee', 'cloturee'] as const
const PRIORITES = ['basse', 'normale', 'haute'] as const

type ReclamationRow = {
  id: number
  date: string
  client_name: string
  client_telephone: string | null
  vehicle_ref: string
  sujet: string
  description: string
  statut: string
  assigne_a: string | null
  priorite: string | null
  techniciens?: { user_full_name: string }[]
}

function toReclamation(r: ReclamationRow) {
  return {
    id: r.id,
    date: r.date,
    clientName: r.client_name,
    clientTelephone: r.client_telephone ?? undefined,
    vehicleRef: r.vehicle_ref,
    sujet: r.sujet,
    description: r.description,
    statut: r.statut as (typeof STATUTS)[number],
    assigneA: r.assigne_a ?? undefined,
    priorite: (r.priorite as (typeof PRIORITES)[number]) ?? undefined,
    techniciens: r.techniciens?.map(t => t.user_full_name) ?? [],
  }
}

/** Crée une notification pour une liste de techniciens (par nom complet) */
async function notifyAssignees(reclamationId: number, names: string[], sujet: string): Promise<void> {
  const cleaned = Array.from(
    new Set(
      names
        .map(n => n.trim())
        .filter(Boolean)
        .map(n => n.toLocaleLowerCase())
    )
  )
  if (!cleaned.length) return
  try {
    if (typeof (prisma as any).notification === 'undefined') return
    const users = await prisma.user.findMany({
      where: {
        statut: 'actif',
        OR: cleaned.map(n => ({ fullName: { equals: n, mode: 'insensitive' as const } })),
      },
      select: { id: true },
    })
    const title = 'Réclamation assignée'
    const message = sujet ? `Vous avez été assigné à la réclamation : ${sujet}` : 'Une réclamation vous a été assignée.'
    const uniqueUserIds = Array.from(new Set(users.map(u => u.id)))
    for (const userId of uniqueUserIds) {
      await (prisma as any).notification.create({
        data: {
          userId,
          type: 'reclamation_assigned',
          reclamationId,
          title,
          message,
        },
      })
    }
  } catch (e) {
    console.error('[reclamations] notifyAssignee:', e)
  }
}

// GET /reclamations - liste avec recherche, filtre statut et gestion des droits
router.get('/', authenticate(), async (req: AuthRequest, res) => {
  try {
    const q = (req.query.q as string)?.trim()
    const statut = (req.query.statut as string)?.trim()

    const where: Record<string, unknown> = {}
    if (q) {
      where.OR = [
        { client_name: { contains: q, mode: 'insensitive' as const } },
        { client_telephone: { contains: q } },
        { vehicle_ref: { contains: q, mode: 'insensitive' as const } },
        { sujet: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
      ]
    }
    if (statut && STATUTS.includes(statut as (typeof STATUTS)[number])) {
      where.statut = statut
    }

    // Gestion des droits :
    // - admin / responsable / financier : voient toutes les réclamations
    // - technicien : uniquement celles qui lui sont assignées (responsable ou dans la liste des techniciens)
    const role = req.user?.role
    const fullName = req.user?.fullName
    if (role === 'technicien' && fullName) {
      const andConditions: unknown[] = (where.AND as unknown[]) ?? []
      andConditions.push({
        OR: [
          { assigne_a: { equals: fullName, mode: 'insensitive' as const } },
          {
            techniciens: {
              some: { user_full_name: { equals: fullName, mode: 'insensitive' as const } },
            },
          },
        ],
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(where as any).AND = andConditions
    }

    const list = (await prisma.reclamation.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      include: { techniciens: true },
    })) as unknown as ReclamationRow[]

    return res.json(list.map(toReclamation))
  } catch (err) {
    console.error(err)
    const message =
      (db as any).reclamation === undefined
        ? 'Backend: exécutez "npx prisma generate" puis redémarrez le serveur.'
        : err instanceof Error ? err.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
})

// GET /reclamations/:id - détail (avec gestion des droits)
router.get('/:id', authenticate(), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const r = (await prisma.reclamation.findUnique({
      where: { id },
      include: { techniciens: true },
    })) as unknown as ReclamationRow | null
    if (!r) return res.status(404).json({ error: 'Réclamation introuvable' })

    const role = req.user?.role
    const fullName = req.user?.fullName
    if (role === 'technicien' && fullName) {
      const assigned = (r.assigne_a ?? '').toLocaleLowerCase()
      const others = (r.techniciens ?? []).map(t => t.user_full_name.toLocaleLowerCase())
      const me = fullName.toLocaleLowerCase()
      if (assigned !== me && !others.includes(me)) {
        return res.status(403).json({ error: 'Accès refusé à cette réclamation' })
      }
    }
    return res.json(toReclamation(r))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /reclamations - créer
router.post('/', authenticate(), async (req, res) => {
  try {
    const body = req.body as {
      date?: string
      clientName?: string
      clientTelephone?: string
      vehicleRef?: string
      sujet?: string
      description?: string
      statut?: string
      assigneA?: string
      priorite?: string
      techniciens?: string[]
    }

    if (!body.clientName?.trim()) {
      return res.status(400).json({ error: 'clientName est requis' })
    }
    if (!body.date?.trim()) {
      return res.status(400).json({ error: 'date est requise' })
    }

    const statut = body.statut && STATUTS.includes(body.statut as (typeof STATUTS)[number]) ? body.statut : 'ouverte'
    const priorite = body.priorite && PRIORITES.includes(body.priorite as (typeof PRIORITES)[number]) ? body.priorite : 'normale'

    const created = await prisma.$transaction(async tx => {
      const rec = await tx.reclamation.create({
        data: {
          date: body.date!.trim(),
          client_name: body.clientName!.trim(),
          client_telephone: (body.clientTelephone ?? '').trim() || null,
          vehicle_ref: (body.vehicleRef ?? '').trim(),
          sujet: (body.sujet ?? '').trim(),
          description: (body.description ?? '').trim(),
          statut,
          assigne_a: (body.assigneA ?? '').trim() || null,
          priorite,
        },
      })

      const names = [
        body.assigneA ?? '',
        ...(Array.isArray(body.techniciens) ? body.techniciens : []),
      ]

      const uniqueNames = Array.from(
        new Set(
          names
            .map(n => n.trim())
            .filter(Boolean)
        )
      )

      if (uniqueNames.length) {
        const users = await tx.user.findMany({
          where: {
            statut: 'actif',
            OR: uniqueNames.map(n => ({ fullName: { equals: n, mode: 'insensitive' as const } })),
          },
          select: { id: true, fullName: true },
        })

        if (users.length) {
          await tx.reclamationTechnicien.createMany({
            data: users.map(u => ({
              reclamationId: rec.id,
              userId: u.id,
              user_full_name: u.fullName,
            })),
          })
        }
      }

      return rec
    })

    const allNames = [
      body.assigneA ?? '',
      ...(Array.isArray(body.techniciens) ? body.techniciens : []),
    ]
    await notifyAssignees(created.id, allNames, (created as any).sujet ?? '')

    const withTechs = (await prisma.reclamation.findUnique({
      where: { id: (created as any).id },
      include: { techniciens: true },
    })) as unknown as ReclamationRow

    return res.status(201).json(toReclamation(withTechs))
  } catch (err) {
    console.error(err)
    const message =
      (db as any).reclamation === undefined
        ? 'Backend: exécutez "npx prisma generate" puis redémarrez le serveur.'
        : err instanceof Error ? err.message : 'Internal server error'
    return res.status(500).json({ error: message })
  }
})

// PUT /reclamations/:id - mise à jour
router.put('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })

    const body = req.body as {
      date?: string
      clientName?: string
      clientTelephone?: string
      vehicleRef?: string
      sujet?: string
      description?: string
      statut?: string
      assigneA?: string
      priorite?: string
      techniciens?: string[]
    }

    const existing = await prisma.reclamation.findUnique({ where: { id }, include: { techniciens: true } })
    if (!existing) return res.status(404).json({ error: 'Réclamation introuvable' })

    if (body.clientName !== undefined && !body.clientName.trim()) {
      return res.status(400).json({ error: 'clientName ne peut pas être vide' })
    }
    if (body.date !== undefined && !body.date.trim()) {
      return res.status(400).json({ error: 'date ne peut pas être vide' })
    }

    const statut = body.statut && STATUTS.includes(body.statut as (typeof STATUTS)[number]) ? body.statut : undefined
    const priorite = body.priorite && PRIORITES.includes(body.priorite as (typeof PRIORITES)[number]) ? body.priorite : undefined

    const updated = await prisma.$transaction(async tx => {
      const rec = await tx.reclamation.update({
        where: { id },
        data: {
          ...(body.date !== undefined && { date: body.date.trim() }),
          ...(body.clientName !== undefined && { client_name: body.clientName.trim() }),
          ...(body.clientTelephone !== undefined && { client_telephone: (body.clientTelephone ?? '').trim() || null }),
          ...(body.vehicleRef !== undefined && { vehicle_ref: (body.vehicleRef ?? '').trim() }),
          ...(body.sujet !== undefined && { sujet: (body.sujet ?? '').trim() }),
          ...(body.description !== undefined && { description: (body.description ?? '').trim() }),
          ...(statut !== undefined && { statut }),
          ...(body.assigneA !== undefined && { assigne_a: (body.assigneA ?? '').trim() || null }),
          ...(priorite !== undefined && { priorite }),
        },
      })

      // Recalcul des techniciens associés
      if (body.techniciens !== undefined || body.assigneA !== undefined) {
        await tx.reclamationTechnicien.deleteMany({ where: { reclamationId: rec.id } })

        const names = [
          body.assigneA ?? (existing?.assigne_a ?? ''),
          ...(Array.isArray(body.techniciens) ? body.techniciens : existing?.techniciens?.map(t => t.user_full_name) ?? []),
        ]

        const uniqueNames = Array.from(
          new Set(
            names
              .map(n => n.trim())
              .filter(Boolean)
          )
        )

        if (uniqueNames.length) {
          const users = await tx.user.findMany({
            where: {
              statut: 'actif',
              OR: uniqueNames.map(n => ({ fullName: { equals: n, mode: 'insensitive' as const } })),
            },
            select: { id: true, fullName: true },
          })

          if (users.length) {
            await tx.reclamationTechnicien.createMany({
              data: users.map(u => ({
                reclamationId: rec.id,
                userId: u.id,
                user_full_name: u.fullName,
              })),
            })
          }
        }
      }

      return rec
    })

    const allNames = [
      body.assigneA ?? (existing?.assigne_a ?? ''),
      ...(Array.isArray(body.techniciens) ? body.techniciens : existing?.techniciens?.map(t => t.user_full_name) ?? []),
    ]
    await notifyAssignees(updated.id, allNames, (updated as any).sujet ?? '')

    const withTechs = (await prisma.reclamation.findUnique({
      where: { id: updated.id },
      include: { techniciens: true },
    })) as unknown as ReclamationRow

    return res.json(toReclamation(withTechs))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /reclamations/:id - suppression
router.delete('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await db.reclamation.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Réclamation introuvable' })
    await db.reclamation.delete({ where: { id } })
    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
