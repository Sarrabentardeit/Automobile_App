import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate())

const db = prisma as any

const ETATS = ['orange', 'mauve', 'sous_traitance', 'attente_client', 'bleu', 'rouge', 'remise_cle', 'retour', 'vert'] as const

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function fmt(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function todayLocal() {
  return fmt(new Date())
}

function parseDate(value: unknown) {
  const raw = typeof value === 'string' ? value.trim() : ''
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : todayLocal()
}

function shift(iso: string, delta: number) {
  const [y, m, d] = iso.split('-').map(Number)
  return fmt(new Date(y, m - 1, d + delta))
}

function mondayOf(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const day = dt.getDay() === 0 ? 7 : dt.getDay()
  return shift(iso, 1 - day)
}

function daysBetween(start: string, end: string) {
  const a = Date.parse(`${String(start || '').slice(0, 10)}T12:00:00`)
  const b = Date.parse(`${String(end || '').slice(0, 10)}T12:00:00`)
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return Math.max(0, Math.round((b - a) / 86400000))
}

async function assertSuiviAccess(req: AuthRequest, res: { status: (code: number) => { json: (body: unknown) => void } }) {
  const userId = req.user?.sub
  if (!userId) {
    res.status(401).json({ error: 'Non connecté' })
    return false
  }
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { permissions: true, role: true },
  })
  const perms = (user?.permissions ?? {}) as Record<string, unknown>
  if (typeof perms.canViewSuivi === 'boolean') {
    if (!perms.canViewSuivi) {
      res.status(403).json({ error: 'Accès suivi refusé' })
      return false
    }
    return true
  }
  const role = String(user?.role || '').toLowerCase()
  if (role === 'admin' || role === 'responsable') return true
  res.status(403).json({ error: 'Accès suivi refusé' })
  return false
}

const vehicleSelect = {
  id: true,
  modele: true,
  immatriculation: true,
  etat_actuel: true,
  defaut: true,
  date_entree: true,
  date_sortie: true,
  technicien_id: true,
  responsable_id: true,
}

router.get('/', async (req: AuthRequest, res) => {
  if (!(await assertSuiviAccess(req, res))) return
  const today = todayLocal()
  let anchor = parseDate(req.query.date)
  if (anchor > today) anchor = today
  const period = req.query.period === 'semaine' ? 'semaine' : 'jour'
  let from = anchor
  let to = anchor
  if (period === 'semaine') {
    from = mondayOf(anchor)
    const sunday = shift(from, 6)
    to = sunday < today ? sunday : today
    if (to < from) to = from
  }
  const garageAsOf = to
  const dayAfter = shift(to, 1)

  const [garageRows, validatedRows] = await Promise.all([
    db.vehicule.findMany({
      where: {
        date_entree: { lte: garageAsOf },
        OR: [
          { etat_actuel: { not: 'vert' } },
          { date_sortie: { gt: garageAsOf } },
        ],
      },
      select: vehicleSelect,
    }),
    db.vehicule.findMany({
      where: {
        etat_actuel: 'vert',
        date_sortie: { gte: from, lte: to },
      },
      select: vehicleSelect,
      orderBy: [{ date_sortie: 'desc' }, { id: 'desc' }],
    }),
  ])

  const past = garageAsOf < today
  const stateAt = new Map<number, string>()
  if (past && garageRows.length > 0) {
    const events = await db.vehiculeHistorique.findMany({
      where: {
        vehiculeId: { in: garageRows.map((v: { id: number }) => v.id) },
        date_changement: { lt: dayAfter },
      },
      orderBy: { date_changement: 'desc' },
      select: { vehiculeId: true, etat_nouveau: true },
    })
    for (const event of events as Array<{ vehiculeId: number; etat_nouveau: string }>) {
      if (!stateAt.has(event.vehiculeId) && ETATS.includes(event.etat_nouveau as (typeof ETATS)[number])) {
        stateAt.set(event.vehiculeId, event.etat_nouveau)
      }
    }
  }

  const garage = (garageRows as Array<{
    id: number
    modele: string
    immatriculation: string
    etat_actuel: string
    defaut: string
    date_entree: string
    date_sortie: string | null
    technicien_id: number | null
    responsable_id: number | null
  }>).map((v) => {
    let etat = past ? stateAt.get(v.id) || (v.etat_actuel === 'vert' ? 'orange' : v.etat_actuel) : v.etat_actuel
    if (etat === 'vert') etat = 'orange'
    return {
      id: v.id,
      modele: v.modele,
      immatriculation: v.immatriculation,
      etat,
      defaut: v.defaut,
      date_entree: v.date_entree,
      technicien_id: v.technicien_id,
      responsable_id: v.responsable_id,
      stayDays: daysBetween(v.date_entree, garageAsOf),
    }
  }).sort((a: { stayDays: number; id: number }, b: { stayDays: number; id: number }) => b.stayDays - a.stayDays || a.id - b.id)

  const validated = (validatedRows as Array<{
    id: number
    modele: string
    immatriculation: string
    defaut: string
    date_entree: string
    date_sortie: string | null
  }>).map((v) => ({
    id: v.id,
    modele: v.modele,
    immatriculation: v.immatriculation,
    defaut: v.defaut,
    date_entree: v.date_entree,
    date_sortie: v.date_sortie,
    stayDays: daysBetween(v.date_entree, v.date_sortie || to),
  }))

  const changeWhere = { date_changement: { gte: from, lt: dayAfter } }
  const [changes, changeCount, notes] = await Promise.all([
    db.vehiculeHistorique.findMany({
      where: changeWhere,
      orderBy: { date_changement: 'desc' },
      take: 250,
      include: { vehicule: { select: { id: true, modele: true, immatriculation: true } } },
    }),
    db.vehiculeHistorique.count({ where: changeWhere }),
    db.reunionNote.findMany({
      where: { date: { gte: from, lte: to }, NOT: { note: '' } },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: { vehicule: { select: { id: true, modele: true, immatriculation: true } } },
    }),
  ])

  const activity = [
    ...(changes as Array<{
      id: number
      date_changement: string
      etat_precedent: string | null
      etat_nouveau: string
      utilisateur_nom: string
      commentaire: string
      vehicule: { id: number; modele: string; immatriculation: string } | null
    }>).map((row) => ({
      id: `etat-${row.id}`,
      at: row.date_changement,
      kind: 'etat' as const,
      vehiculeId: row.vehicule?.id ?? 0,
      modele: row.vehicule?.modele ?? '',
      immatriculation: row.vehicule?.immatriculation ?? '',
      etatFrom: row.etat_precedent,
      etatTo: row.etat_nouveau,
      auteur: row.utilisateur_nom || '',
      detail: row.commentaire || '',
    })),
    ...(notes as Array<{
      id: number
      updatedAt: Date
      note: string
      updatedBy: string
      vehicule: { id: number; modele: string; immatriculation: string } | null
    }>).map((row) => ({
      id: `note-${row.id}`,
      at: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
      kind: 'note' as const,
      vehiculeId: row.vehicule?.id ?? 0,
      modele: row.vehicule?.modele ?? '',
      immatriculation: row.vehicule?.immatriculation ?? '',
      etatFrom: null,
      etatTo: null,
      auteur: row.updatedBy || '',
      detail: row.note || '',
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, 250)

  const waitingParts = garage.filter((row: { etat: string; stayDays: number }) => row.etat === 'mauve' && row.stayDays >= 5).length

  return res.json({
    from,
    to,
    period,
    garageAsOf,
    metrics: {
      inGarage: garage.length,
      validated: validated.length,
      waitingParts,
    },
    garage,
    validated,
    activity,
    truncated: changeCount > 250,
  })
})

export default router
