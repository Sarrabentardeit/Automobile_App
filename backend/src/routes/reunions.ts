import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate())

async function assertReunionAccess(req: AuthRequest, res: { status: (code: number) => { json: (body: unknown) => void } }) {
  const userId = req.user?.sub
  if (!userId) {
    res.status(401).json({ error: 'Non connecté' })
    return false
  }
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { permissions: true },
  })
  const perms = (user?.permissions ?? {}) as Record<string, unknown>
  if (perms.canViewReunion === false) {
    res.status(403).json({ error: 'Accès réunion refusé' })
    return false
  }
  return true
}

const db = prisma as any

function todayLocal() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseDate(value: unknown) {
  const raw = typeof value === 'string' ? value.trim() : ''
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : todayLocal()
}

function toRow(v: {
  id: number
  modele: string
  immatriculation: string
  etat_actuel: string
  defaut: string
  notes: string
  date_entree: string
  date_sortie: string | null
  technicien_id: number | null
  responsable_id: number | null
}, note: string) {
  return {
    id: v.id,
    modele: v.modele,
    immatriculation: v.immatriculation,
    etat_actuel: v.etat_actuel,
    defaut: v.defaut,
    notes: v.notes,
    date_entree: v.date_entree,
    date_sortie: v.date_sortie,
    technicien_id: v.technicien_id,
    responsable_id: v.responsable_id,
    note,
  }
}

function presentOnDay(v: { etat_actuel: string; date_entree: string; date_sortie: string | null }, date: string) {
  const entry = String(v.date_entree || '').slice(0, 10)
  if (!entry || entry > date) return false
  if (v.etat_actuel !== 'vert') return true
  const sortie = String(v.date_sortie || '').slice(0, 10)
  if (!sortie) return true
  return sortie >= date
}

router.get('/', async (req: AuthRequest, res) => {
  if (!(await assertReunionAccess(req, res))) return
  const date = parseDate(req.query.date)
  const [vehicles, saved] = await Promise.all([
    db.vehicule.findMany({
      orderBy: [{ date_entree: 'asc' }, { id: 'asc' }],
    }),
    db.reunionNote.findMany({ where: { date } }),
  ])
  const noteById = new Map<number, string>(saved.map((n: { vehiculeId: number; note: string }) => [n.vehiculeId, n.note]))
  const rows = vehicles
    .filter((v: { etat_actuel: string; date_entree: string; date_sortie: string | null }) => presentOnDay(v, date))
    .map((v: {
      id: number
      modele: string
      immatriculation: string
      etat_actuel: string
      defaut: string
      notes: string
      date_entree: string
      date_sortie: string | null
      technicien_id: number | null
      responsable_id: number | null
    }) => toRow(v, noteById.get(v.id) ?? ''))
  res.json({ date, rows })
})

router.put('/', async (req: AuthRequest, res) => {
  if (!(await assertReunionAccess(req, res))) return
  const body = req.body as { date?: unknown; vehiculeId?: unknown; note?: unknown }
  const date = parseDate(body.date)
  const vehiculeId = Number(body.vehiculeId)
  if (!Number.isInteger(vehiculeId) || vehiculeId <= 0) {
    res.status(400).json({ error: 'Véhicule invalide' })
    return
  }
  const vehicule = await db.vehicule.findUnique({ where: { id: vehiculeId } })
  if (!vehicule) {
    res.status(404).json({ error: 'Véhicule introuvable' })
    return
  }
  const note = typeof body.note === 'string' ? body.note.slice(0, 2000) : ''
  const updatedBy = req.user?.fullName || req.user?.email || ''
  const row = await db.reunionNote.upsert({
    where: { date_vehiculeId: { date, vehiculeId } },
    create: { date, vehiculeId, note, updatedBy },
    update: { note, updatedBy },
  })
  res.json({ date, vehiculeId, note: row.note })
})

export default router
