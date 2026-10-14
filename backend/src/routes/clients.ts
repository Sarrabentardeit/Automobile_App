import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()
const db = prisma as any

type CarteAcces = 'standard' | 'advanced'

function todayIso() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function toClient(c: {
  id: number
  nom: string
  telephone: string
  email: string | null
  adresse: string | null
  notes: string | null
  matricule_fiscale: string | null
  carte_vip_numero?: string | null
  carte_vip_debut?: string | null
  carte_vip_fin?: string | null
  carte_vip_acces?: string | null
}) {
  const acces = c.carte_vip_acces === 'advanced' || c.carte_vip_acces === 'standard' ? c.carte_vip_acces : null
  const carteVip =
    c.carte_vip_numero && acces && c.carte_vip_debut && c.carte_vip_fin
      ? {
          numero: c.carte_vip_numero,
          debut: c.carte_vip_debut,
          fin: c.carte_vip_fin,
          acces,
        }
      : null
  return {
    id: c.id,
    nom: c.nom,
    telephone: c.telephone,
    email: c.email ?? undefined,
    adresse: c.adresse ?? undefined,
    notes: c.notes ?? undefined,
    matriculeFiscale: c.matricule_fiscale ?? undefined,
    carteVip,
  }
}

async function nextCarteNumero() {
  const rows = (await db.client.findMany({
    where: { carte_vip_numero: { startsWith: 'VIP-' } },
    select: { carte_vip_numero: true },
  })) as Array<{ carte_vip_numero: string | null }>
  let max = 0
  for (const row of rows) {
    const n = Number(String(row.carte_vip_numero ?? '').replace(/^VIP-/, ''))
    if (Number.isFinite(n) && n > max) max = n
  }
  return `VIP-${String(max + 1).padStart(4, '0')}`
}

function parseCarte(value: unknown): { clear: true } | { numero: string; debut: string; fin: string; acces: CarteAcces } | { skip: true } {
  if (value === undefined) return { skip: true }
  if (value === null) return { clear: true }
  const body = value as { numero?: string; debut?: string; fin?: string; acces?: string }
  const acces = body.acces === 'advanced' ? 'advanced' : body.acces === 'standard' ? 'standard' : null
  const debut = (body.debut ?? '').trim()
  const fin = (body.fin ?? '').trim()
  const numero = (body.numero ?? '').trim()
  if (!acces) {
    const err = new Error('Choisissez un accès Standard ou Advanced.')
    ;(err as Error & { status?: number }).status = 400
    throw err
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(debut) || !/^\d{4}-\d{2}-\d{2}$/.test(fin)) {
    const err = new Error('Les dates de validité sont requises.')
    ;(err as Error & { status?: number }).status = 400
    throw err
  }
  if (fin < debut) {
    const err = new Error('La date de fin doit être après la date de début.')
    ;(err as Error & { status?: number }).status = 400
    throw err
  }
  return { numero, debut, fin, acces }
}

function carteFilter(carte: string | undefined) {
  const today = todayIso()
  if (carte === 'standard' || carte === 'advanced') {
    return {
      carte_vip_acces: carte,
      carte_vip_debut: { lte: today },
      carte_vip_fin: { gte: today },
    }
  }
  if (carte === 'expiree') {
    return {
      NOT: { carte_vip_numero: null },
      carte_vip_fin: { lt: today },
    }
  }
  return undefined
}

// GET /clients/stats - statistiques
router.get('/stats', authenticate(), async (_req, res) => {
  try {
    const total = await db.client.count()
    return res.json({ total })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/next-carte', authenticate(), async (_req, res) => {
  try {
    return res.json({ numero: await nextCarteNumero() })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /clients - liste avec recherche et pagination
router.get('/', authenticate(), async (req, res) => {
  try {
    const q = (req.query.q as string)?.trim()
    const carte = (req.query.carte as string)?.trim()
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50))

    const search = q
      ? {
          OR: [
            { nom: { contains: q, mode: 'insensitive' as const } },
            { telephone: { contains: q, mode: 'insensitive' as const } },
            { email: { contains: q, mode: 'insensitive' as const } },
            { adresse: { contains: q, mode: 'insensitive' as const } },
            { carte_vip_numero: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : undefined
    const vip = carteFilter(carte)
    const where = search && vip ? { AND: [search, vip] } : search ?? vip

    const [list, total] = await Promise.all([
      db.client.findMany({
        where,
        orderBy: { nom: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.client.count({ where }),
    ])

    return res.json({
      data: list.map(toClient),
      total,
      page,
      limit,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /clients/:id - détail
router.get('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const c = await db.client.findUnique({ where: { id } })
    if (!c) return res.status(404).json({ error: 'Client introuvable' })
    return res.json(toClient(c))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /clients - créer
router.post('/', authenticate(), async (req, res) => {
  try {
    const body = req.body as {
      nom?: string
      telephone?: string
      email?: string
      adresse?: string
      notes?: string
      matriculeFiscale?: string
      carteVip?: unknown
    }
    if (!body.nom?.trim()) return res.status(400).json({ error: 'nom est requis' })
    if (!body.telephone?.trim()) return res.status(400).json({ error: 'telephone est requis' })
    const carte = parseCarte(body.carteVip)
    const numero = 'numero' in carte ? carte.numero || (await nextCarteNumero()) : undefined

    const c = await db.client.create({
      data: {
        nom: body.nom.trim(),
        telephone: body.telephone.trim(),
        email: (body.email ?? '').trim() || null,
        adresse: (body.adresse ?? '').trim() || null,
        notes: (body.notes ?? '').trim() || null,
        matricule_fiscale: (body.matriculeFiscale ?? '').trim() || null,
        ...('acces' in carte
          ? {
              carte_vip_numero: numero,
              carte_vip_debut: carte.debut,
              carte_vip_fin: carte.fin,
              carte_vip_acces: carte.acces,
            }
          : {}),
      },
    })
    return res.status(201).json(toClient(c))
  } catch (err) {
    const status = (err as { status?: number }).status
    if (status === 400) return res.status(400).json({ error: (err as Error).message })
    if ((err as { code?: string }).code === 'P2002') return res.status(400).json({ error: 'Ce numéro de carte existe déjà.' })
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /clients/:id - modifier
router.put('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const body = req.body as {
      nom?: string
      telephone?: string
      email?: string
      adresse?: string
      notes?: string
      matriculeFiscale?: string
      carteVip?: unknown
    }

    const existing = await db.client.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Client introuvable' })
    const carte = parseCarte(body.carteVip)
    const numero =
      'numero' in carte
        ? carte.numero || existing.carte_vip_numero || (await nextCarteNumero())
        : undefined

    const c = await db.client.update({
      where: { id },
      data: {
        ...(body.nom !== undefined && { nom: body.nom.trim() }),
        ...(body.telephone !== undefined && { telephone: body.telephone.trim() }),
        ...(body.email !== undefined && { email: (body.email ?? '').trim() || null }),
        ...(body.adresse !== undefined && { adresse: (body.adresse ?? '').trim() || null }),
        ...(body.notes !== undefined && { notes: (body.notes ?? '').trim() || null }),
        ...(body.matriculeFiscale !== undefined && {
          matricule_fiscale: (body.matriculeFiscale ?? '').trim() || null,
        }),
        ...('clear' in carte
          ? { carte_vip_numero: null, carte_vip_debut: null, carte_vip_fin: null, carte_vip_acces: null }
          : {}),
        ...('acces' in carte
          ? {
              carte_vip_numero: numero,
              carte_vip_debut: carte.debut,
              carte_vip_fin: carte.fin,
              carte_vip_acces: carte.acces,
            }
          : {}),
      },
    })
    return res.json(toClient(c))
  } catch (err) {
    const status = (err as { status?: number }).status
    if (status === 400) return res.status(400).json({ error: (err as Error).message })
    if ((err as { code?: string }).code === 'P2002') return res.status(400).json({ error: 'Ce numéro de carte existe déjà.' })
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /clients/:id - supprimer
router.delete('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await db.client.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Client introuvable' })
    await db.client.delete({ where: { id } })
    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
