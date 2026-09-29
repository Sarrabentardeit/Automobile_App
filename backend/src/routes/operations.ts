import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'
import { allowsOperation, operationAccess, requireOperation } from '../lib/operationAccess'

const router = Router()
router.use(authenticate())

const db = prisma as any

function canManage(req: AuthRequest) {
  return (req.user?.role ?? '').toLowerCase() === 'admin'
}

function toOperation(row: { id: number; nom: string; cle: string | null; actif: boolean }) {
  return { id: row.id, nom: row.nom, cle: row.cle, actif: row.actif }
}

function toEntry(row: {
  id: number
  date: string
  vehicule: string
  type_travaux: string
  prix_garage: number | null
  prix: number
}) {
  return {
    id: row.id,
    date: row.date,
    vehicule: row.vehicule,
    typeTravaux: row.type_travaux,
    prixGarage: row.prix_garage ?? null,
    prix: row.prix,
  }
}

function parseNom(body: unknown): string | null {
  const nom = typeof (body as { nom?: unknown })?.nom === 'string' ? (body as { nom: string }).nom.trim() : ''
  if (nom.length < 2 || nom.length > 40) return null
  return nom
}

function parseEntry(body: unknown) {
  const raw = body as {
    date?: unknown
    vehicule?: unknown
    typeTravaux?: unknown
    prixGarage?: unknown
    prix?: unknown
  }
  const date = typeof raw.date === 'string' ? raw.date.trim() : ''
  const prix = typeof raw.prix === 'number' ? raw.prix : Number(raw.prix)
  if (!date || !Number.isFinite(prix)) return null
  const prixGarageRaw = raw.prixGarage
  const prixGarage =
    prixGarageRaw == null || prixGarageRaw === ''
      ? null
      : typeof prixGarageRaw === 'number'
        ? prixGarageRaw
        : Number(prixGarageRaw)
  return {
    date,
    vehicule: typeof raw.vehicule === 'string' ? raw.vehicule : '',
    typeTravaux: typeof raw.typeTravaux === 'string' ? raw.typeTravaux : '',
    prixGarage: prixGarage != null && Number.isFinite(prixGarage) ? prixGarage : null,
    prix,
  }
}

router.get('/', async (req: AuthRequest, res) => {
  const access = await operationAccess(req)
  const rows = await db.operation.findMany({ orderBy: { id: 'asc' } })
  const visible = access === 'all' ? rows : rows.filter((row: { id: number }) => allowsOperation(access, row.id))
  res.json(visible.map(toOperation))
})

router.post('/', async (req: AuthRequest, res) => {
  if (!canManage(req)) {
    res.status(403).json({ error: 'Seul un administrateur peut ajouter une opération' })
    return
  }
  const nom = parseNom(req.body)
  if (!nom) {
    res.status(400).json({ error: 'Indiquez un nom entre 2 et 40 caractères' })
    return
  }
  const row = await db.operation.create({ data: { nom, actif: true } })
  res.status(201).json(toOperation(row))
})

router.put('/:id', async (req: AuthRequest, res) => {
  if (!canManage(req)) {
    res.status(403).json({ error: 'Seul un administrateur peut modifier une opération' })
    return
  }
  const id = Number(req.params.id)
  const existing = await db.operation.findUnique({ where: { id } })
  if (!existing) {
    res.status(404).json({ error: 'Opération introuvable' })
    return
  }
  const body = req.body as { nom?: unknown; actif?: unknown }
  const data: { nom?: string; actif?: boolean } = {}
  if (body.nom != null) {
    const nom = parseNom(body)
    if (!nom) {
      res.status(400).json({ error: 'Indiquez un nom entre 2 et 40 caractères' })
      return
    }
    data.nom = nom
  }
  if (typeof body.actif === 'boolean') data.actif = body.actif
  const row = await db.operation.update({ where: { id }, data })
  res.json(toOperation(row))
})

router.get('/by-cle/:cle', async (req: AuthRequest, res) => {
  const row = await db.operation.findUnique({ where: { cle: req.params.cle } })
  if (!row) {
    res.status(404).json({ error: 'Opération introuvable' })
    return
  }
  if (!(await requireOperation(req, res, row.id))) return
  res.json(toOperation(row))
})

router.get('/:id/entries', async (req: AuthRequest, res) => {
  const operationId = Number(req.params.id)
  const op = await db.operation.findUnique({ where: { id: operationId } })
  if (!op) {
    res.status(404).json({ error: 'Opération introuvable' })
    return
  }
  if (!(await requireOperation(req, res, operationId))) return
  const rows = await db.operationEntry.findMany({
    where: { operationId },
    orderBy: [{ date: 'desc' }, { id: 'desc' }],
  })
  res.json({ operation: toOperation(op), entries: rows.map(toEntry) })
})

router.post('/:id/entries', async (req: AuthRequest, res) => {
  const operationId = Number(req.params.id)
  const op = await db.operation.findUnique({ where: { id: operationId } })
  if (!op) {
    res.status(404).json({ error: 'Opération introuvable' })
    return
  }
  if (!(await requireOperation(req, res, operationId))) return
  const parsed = parseEntry(req.body)
  if (!parsed) {
    res.status(400).json({ error: 'Données invalides' })
    return
  }
  const row = await db.operationEntry.create({
    data: {
      operationId,
      date: parsed.date,
      vehicule: parsed.vehicule,
      type_travaux: parsed.typeTravaux,
      prix_garage: parsed.prixGarage,
      prix: parsed.prix,
    },
  })
  res.status(201).json(toEntry(row))
})

router.put('/:id/entries/:entryId', async (req: AuthRequest, res) => {
  const operationIdEarly = Number(req.params.id)
  if (!(await requireOperation(req, res, operationIdEarly))) return
  const operationId = Number(req.params.id)
  const entryId = Number(req.params.entryId)
  const parsed = parseEntry(req.body)
  if (!parsed) {
    res.status(400).json({ error: 'Données invalides' })
    return
  }
  const existing = await db.operationEntry.findFirst({ where: { id: entryId, operationId } })
  if (!existing) {
    res.status(404).json({ error: 'Entrée introuvable' })
    return
  }
  const row = await db.operationEntry.update({
    where: { id: entryId },
    data: {
      date: parsed.date,
      vehicule: parsed.vehicule,
      type_travaux: parsed.typeTravaux,
      prix_garage: parsed.prixGarage,
      prix: parsed.prix,
    },
  })
  res.json(toEntry(row))
})

router.delete('/:id/entries/:entryId', async (req: AuthRequest, res) => {
  const operationIdEarly = Number(req.params.id)
  if (!(await requireOperation(req, res, operationIdEarly))) return
  const operationId = Number(req.params.id)
  const entryId = Number(req.params.entryId)
  const existing = await db.operationEntry.findFirst({ where: { id: entryId, operationId } })
  if (!existing) {
    res.status(404).json({ error: 'Entrée introuvable' })
    return
  }
  await db.operationEntry.delete({ where: { id: entryId } })
  res.status(204).send()
})

export default router
