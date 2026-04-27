import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'

const router = Router({ mergeParams: true })
const db = prisma as any

const STATUTS_LIGNE = ['en_attente', 'fait', 'na'] as const

const DEFAULT_LIGNES = [
  'VERIFICATION NIVEAU LIQUIDE REFROIDISSEMENT',
  "VERIFICATION NIVEAU D'HUILE MOTEUR",
  'VERIFICATION NIVEAU HUILE FREIN',
  'INSPECTION DISQUES ET PLAQUETTES DE FREIN',
  'INSPECTION PNEUS',
  'DIAGNOSTIC',
]

type LigneInput = { description: string; statut?: string; ordre?: number }

function toOrdre(o: {
  id: number
  vehiculeId: number
  numero: string
  clientNom: string
  clientTelephone: string
  voiture: string
  immatriculation: string
  kilometrage: number | null
  dateEntree: string
  technicien: string
  vin: string
  carrosserieJson: unknown
  voyantsJson: unknown
  rempliPar: string
  complementJson?: unknown
  createdAt: Date
  updatedAt: Date
  lignes: Array<{
    id: number
    ordreReparationId: number
    ordre: number
    description: string
    statut: string
  }>
}) {
  return {
    id: o.id,
    vehiculeId: o.vehiculeId,
    numero: o.numero,
    clientNom: o.clientNom,
    clientTelephone: o.clientTelephone,
    voiture: o.voiture,
    immatriculation: o.immatriculation,
    kilometrage: o.kilometrage,
    dateEntree: o.dateEntree,
    technicien: o.technicien,
    vin: o.vin,
    carrosserieJson: o.carrosserieJson ?? null,
    voyantsJson: o.voyantsJson ?? null,
    complementJson: o.complementJson ?? null,
    rempliPar: o.rempliPar,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    lignes: o.lignes
      .slice()
      .sort((a, b) => a.ordre - b.ordre || a.id - b.id)
      .map(l => ({
        id: l.id,
        description: l.description,
        statut: l.statut,
        ordre: l.ordre,
      })),
  }
}

async function ensureVehicule(id: number) {
  const v = await db.vehicule.findUnique({ where: { id } })
  return v
}

/** GET /vehicules/:id/ordres-reparation */
router.get('/:id/ordres-reparation', authenticate(), async (req, res) => {
  try {
    if (typeof db.ordreReparation === 'undefined') {
      return res.status(500).json({
        error: 'Modèle OrdreReparation absent. Exécutez `npx prisma generate` et `npx prisma migrate deploy`.',
      })
    }
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const v = await ensureVehicule(id)
    if (!v) return res.status(404).json({ error: 'Véhicule introuvable' })
    const list = await db.ordreReparation.findMany({
      where: { vehiculeId: id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { lignes: true },
    })
    return res.json((list as any[]).map(toOrdre))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** GET /vehicules/:id/ordres-reparation/:ordreId */
router.get('/:id/ordres-reparation/:ordreId', authenticate(), async (req, res) => {
  try {
    const vehiculeId = Number(req.params.id)
    const ordreId = Number(req.params.ordreId)
    if (isNaN(vehiculeId) || isNaN(ordreId)) return res.status(400).json({ error: 'ID invalide' })
    const v = await ensureVehicule(vehiculeId)
    if (!v) return res.status(404).json({ error: 'Véhicule introuvable' })
    const o = await db.ordreReparation.findFirst({
      where: { id: ordreId, vehiculeId },
      include: { lignes: true },
    })
    if (!o) return res.status(404).json({ error: 'Ordre introuvable' })
    return res.json(toOrdre(o as any))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

function normalizeLignes(body: { lignes?: unknown }): LigneInput[] {
  const raw = body.lignes
  if (!Array.isArray(raw)) return []
  const out: LigneInput[] = []
  for (const x of raw) {
    if (typeof x !== 'object' || x === null) continue
    const d = (x as { description?: unknown; statut?: unknown; ordre?: unknown }).description
    if (typeof d !== 'string' || !d.trim()) continue
    let statut = String((x as { statut?: string }).statut ?? 'en_attente')
    if (!STATUTS_LIGNE.includes(statut as (typeof STATUTS_LIGNE)[number])) statut = 'en_attente'
    const ordre = typeof (x as { ordre?: unknown }).ordre === 'number' ? (x as { ordre: number }).ordre : out.length
    out.push({ description: d.trim(), statut, ordre })
  }
  return out
}

/** POST /vehicules/:id/ordres-reparation */
router.post('/:id/ordres-reparation', authenticate(), async (req: AuthRequest, res) => {
  try {
    const vehiculeId = Number(req.params.id)
    if (isNaN(vehiculeId)) return res.status(400).json({ error: 'ID invalide' })
    const v = await ensureVehicule(vehiculeId)
    if (!v) return res.status(404).json({ error: 'Véhicule introuvable' })

    const body = req.body as Record<string, unknown>
    const clientNom = typeof body.clientNom === 'string' ? body.clientNom : ''
    const clientTelephone = typeof body.clientTelephone === 'string' ? body.clientTelephone : ''
    const voiture = typeof body.voiture === 'string' ? body.voiture : ''
    const immatriculation = typeof body.immatriculation === 'string' ? body.immatriculation : ''
    const kilo = body.kilometrage
    const kilometrage = typeof kilo === 'number' && !Number.isNaN(kilo) ? Math.round(kilo) : kilo === null ? null : undefined
    const dateEntree = typeof body.dateEntree === 'string' && body.dateEntree.trim() ? body.dateEntree.trim() : (v.date_entree as string)
    const technicien = typeof body.technicien === 'string' ? body.technicien : ''
    const vin = typeof body.vin === 'string' ? body.vin : ''
    const rempliPar =
      typeof body.rempliPar === 'string' && body.rempliPar.trim()
        ? body.rempliPar.trim()
        : (req.user?.fullName ?? '')

    const carrosserieJson = body.carrosserieJson !== undefined ? body.carrosserieJson : undefined
    const voyantsJson = body.voyantsJson !== undefined ? body.voyantsJson : undefined
    const complementJson = body.complementJson !== undefined ? body.complementJson : undefined

    let lignesIn = normalizeLignes(body)
    if (lignesIn.length === 0) {
      lignesIn = DEFAULT_LIGNES.map((description, i) => ({ description, ordre: i, statut: 'en_attente' }))
    }

    const created = await db.$transaction(async (tx: any) => {
      const o = await tx.ordreReparation.create({
        data: {
          vehiculeId,
          numero: '',
          clientNom,
          clientTelephone,
          voiture,
          immatriculation,
          kilometrage: kilometrage === undefined ? null : kilometrage,
          dateEntree,
          technicien,
          vin,
          carrosserieJson: carrosserieJson === undefined ? undefined : carrosserieJson,
          voyantsJson: voyantsJson === undefined ? undefined : voyantsJson,
          complementJson: complementJson === undefined ? undefined : complementJson,
          rempliPar,
          lignes: {
            create: lignesIn.map((l, idx) => ({
              ordre: l.ordre ?? idx,
              description: l.description,
              statut: l.statut ?? 'en_attente',
            })),
          },
        },
        include: { lignes: true },
      })
      const y = new Date().getFullYear()
      const numero = `OR-${y}-${String(o.id).padStart(5, '0')}`
      return tx.ordreReparation.update({
        where: { id: o.id },
        data: { numero },
        include: { lignes: true },
      })
    })

    return res.status(201).json(toOrdre(created as any))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** PUT /vehicules/:id/ordres-reparation/:ordreId */
router.put('/:id/ordres-reparation/:ordreId', authenticate(), async (req, res) => {
  try {
    const vehiculeId = Number(req.params.id)
    const ordreId = Number(req.params.ordreId)
    if (isNaN(vehiculeId) || isNaN(ordreId)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await db.ordreReparation.findFirst({ where: { id: ordreId, vehiculeId } })
    if (!existing) return res.status(404).json({ error: 'Ordre introuvable' })

    const body = req.body as Record<string, unknown>
    const data: Record<string, unknown> = {}
    if (typeof body.clientNom === 'string') data.clientNom = body.clientNom
    if (typeof body.clientTelephone === 'string') data.clientTelephone = body.clientTelephone
    if (typeof body.voiture === 'string') data.voiture = body.voiture
    if (typeof body.immatriculation === 'string') data.immatriculation = body.immatriculation
    if (body.kilometrage === null) data.kilometrage = null
    else if (typeof body.kilometrage === 'number' && !Number.isNaN(body.kilometrage)) data.kilometrage = Math.round(body.kilometrage)
    if (typeof body.dateEntree === 'string' && body.dateEntree.trim()) data.dateEntree = body.dateEntree.trim()
    if (typeof body.technicien === 'string') data.technicien = body.technicien
    if (typeof body.vin === 'string') data.vin = body.vin
    if (typeof body.rempliPar === 'string') data.rempliPar = body.rempliPar
    if (body.carrosserieJson !== undefined) data.carrosserieJson = body.carrosserieJson
    if (body.voyantsJson !== undefined) data.voyantsJson = body.voyantsJson
    if (body.complementJson !== undefined) data.complementJson = body.complementJson

    const updated = await db.$transaction(async (tx: any) => {
      await tx.ordreReparation.update({ where: { id: ordreId }, data })
      if (Array.isArray(body.lignes)) {
        const lignesIn = normalizeLignes({ lignes: body.lignes })
        await tx.ordreReparationLigne.deleteMany({ where: { ordreReparationId: ordreId } })
        if (lignesIn.length) {
          await tx.ordreReparationLigne.createMany({
            data: lignesIn.map((l, idx) => ({
              ordreReparationId: ordreId,
              ordre: l.ordre ?? idx,
              description: l.description,
              statut: l.statut ?? 'en_attente',
            })),
          })
        }
      }
      return tx.ordreReparation.findFirst({
        where: { id: ordreId },
        include: { lignes: true },
      })
    })
    if (!updated) return res.status(404).json({ error: 'Ordre introuvable' })
    return res.json(toOrdre(updated as any))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** DELETE /vehicules/:id/ordres-reparation/:ordreId */
router.delete('/:id/ordres-reparation/:ordreId', authenticate(), async (req, res) => {
  try {
    const vehiculeId = Number(req.params.id)
    const ordreId = Number(req.params.ordreId)
    if (isNaN(vehiculeId) || isNaN(ordreId)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await db.ordreReparation.findFirst({ where: { id: ordreId, vehiculeId } })
    if (!existing) return res.status(404).json({ error: 'Ordre introuvable' })
    await db.ordreReparation.delete({ where: { id: ordreId } })
    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
