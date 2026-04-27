import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'

const router = Router({ mergeParams: true })
const db = prisma as any

function toSuivi(s: {
  id: number
  vehiculeId: number
  numero: string
  date: string
  voiture: string
  matricule: string
  kilometrage: string
  travauxEffectues: string
  travauxProchains: string
  produitsUtilises: string
  technicien: string
  rempliPar: string
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: s.id,
    vehiculeId: s.vehiculeId,
    numero: s.numero,
    date: s.date,
    voiture: s.voiture,
    matricule: s.matricule,
    kilometrage: s.kilometrage,
    travauxEffectues: s.travauxEffectues,
    travauxProchains: s.travauxProchains,
    produitsUtilises: s.produitsUtilises,
    technicien: s.technicien,
    rempliPar: s.rempliPar,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }
}

/** GET /vehicules/:id/suivis */
router.get('/:id/suivis', authenticate(), async (req, res) => {
  try {
    if (typeof db.vehiculeSuivi === 'undefined')
      return res.status(500).json({ error: 'Modèle VehiculeSuivi absent. Exécutez `npx prisma migrate deploy` puis `npx prisma generate`.' })
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const list = await db.vehiculeSuivi.findMany({
      where: { vehiculeId: id },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    })
    return res.json((list as any[]).map(toSuivi))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** POST /vehicules/:id/suivis */
router.post('/:id/suivis', authenticate(), async (req: AuthRequest, res) => {
  try {
    const vehiculeId = Number(req.params.id)
    if (isNaN(vehiculeId)) return res.status(400).json({ error: 'ID invalide' })
    const v = await db.vehicule.findUnique({ where: { id: vehiculeId } })
    if (!v) return res.status(404).json({ error: 'Véhicule introuvable' })

    const body = req.body as Record<string, unknown>
    const today = new Date().toISOString().slice(0, 10)
    const date = typeof body.date === 'string' && body.date.trim() ? body.date.trim() : today
    const rempliPar = typeof body.rempliPar === 'string' && body.rempliPar.trim()
      ? body.rempliPar.trim()
      : (req.user?.fullName ?? '')

    const created = await db.$transaction(async (tx: any) => {
      const s = await tx.vehiculeSuivi.create({
        data: {
          vehiculeId,
          numero: '',
          date,
          voiture: typeof body.voiture === 'string' ? body.voiture : v.modele,
          matricule: typeof body.matricule === 'string' ? body.matricule : v.immatriculation,
          kilometrage: typeof body.kilometrage === 'string' ? body.kilometrage : '',
          travauxEffectues: typeof body.travauxEffectues === 'string' ? body.travauxEffectues : '',
          travauxProchains: typeof body.travauxProchains === 'string' ? body.travauxProchains : '',
          produitsUtilises: typeof body.produitsUtilises === 'string' ? body.produitsUtilises : '',
          technicien: typeof body.technicien === 'string' ? body.technicien : '',
          rempliPar,
        },
      })
      const year = new Date().getFullYear()
      const numero = `SV-${year}-${String(s.id).padStart(5, '0')}`
      return tx.vehiculeSuivi.update({ where: { id: s.id }, data: { numero } })
    })
    return res.status(201).json(toSuivi(created as any))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** PUT /vehicules/:id/suivis/:suiviId */
router.put('/:id/suivis/:suiviId', authenticate(), async (req, res) => {
  try {
    const vehiculeId = Number(req.params.id)
    const suiviId = Number(req.params.suiviId)
    if (isNaN(vehiculeId) || isNaN(suiviId)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await db.vehiculeSuivi.findFirst({ where: { id: suiviId, vehiculeId } })
    if (!existing) return res.status(404).json({ error: 'Suivi introuvable' })

    const body = req.body as Record<string, unknown>
    const data: Record<string, unknown> = {}
    if (typeof body.date === 'string' && body.date.trim()) data.date = body.date.trim()
    if (typeof body.voiture === 'string') data.voiture = body.voiture
    if (typeof body.matricule === 'string') data.matricule = body.matricule
    if (typeof body.kilometrage === 'string') data.kilometrage = body.kilometrage
    if (typeof body.travauxEffectues === 'string') data.travauxEffectues = body.travauxEffectues
    if (typeof body.travauxProchains === 'string') data.travauxProchains = body.travauxProchains
    if (typeof body.produitsUtilises === 'string') data.produitsUtilises = body.produitsUtilises
    if (typeof body.technicien === 'string') data.technicien = body.technicien
    if (typeof body.rempliPar === 'string') data.rempliPar = body.rempliPar

    const updated = await db.vehiculeSuivi.update({ where: { id: suiviId }, data })
    return res.json(toSuivi(updated as any))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** DELETE /vehicules/:id/suivis/:suiviId */
router.delete('/:id/suivis/:suiviId', authenticate(), async (req, res) => {
  try {
    const vehiculeId = Number(req.params.id)
    const suiviId = Number(req.params.suiviId)
    if (isNaN(vehiculeId) || isNaN(suiviId)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await db.vehiculeSuivi.findFirst({ where: { id: suiviId, vehiculeId } })
    if (!existing) return res.status(404).json({ error: 'Suivi introuvable' })
    await db.vehiculeSuivi.delete({ where: { id: suiviId } })
    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
