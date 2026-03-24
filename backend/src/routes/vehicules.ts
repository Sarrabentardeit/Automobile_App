import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'
import { promises as fs } from 'fs'
import path from 'path'

const router = Router()
const db = prisma as any

const ETATS = ['orange', 'mauve', 'bleu', 'rouge', 'vert', 'retour'] as const
const TYPES = ['voiture', 'moto'] as const
const IMAGE_CATEGORIES = ['etat_exterieur', 'etat_interieur', 'compteur', 'plaque', 'dommage', 'intervention'] as const
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads', 'vehicules')
const TRANSITIONS: Record<string, string[]> = {
  orange: ['bleu', 'mauve', 'rouge', 'vert', 'retour'],
  mauve: ['orange'],
  bleu: ['vert', 'orange'],
  rouge: ['orange', 'mauve'],
  vert: ['retour'],
  retour: [],
}

function toVehiculeImage(i: {
  id: number
  vehiculeId: number
  url_path: string
  original_name: string
  mime_type: string
  size_bytes: number
  category: string
  note: string
  created_by_id: number | null
  created_by: string
  createdAt: Date
}) {
  return {
    id: i.id,
    vehicule_id: i.vehiculeId,
    url_path: i.url_path,
    original_name: i.original_name,
    mime_type: i.mime_type,
    size_bytes: i.size_bytes,
    category: i.category,
    note: i.note,
    created_by_id: i.created_by_id,
    created_by: i.created_by,
    created_at: i.createdAt.toISOString(),
  }
}

function getImageExtension(mimeType: string): string {
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/heic') return 'heic'
  return 'bin'
}

function sanitizeOriginalName(fileName?: string): string {
  const raw = (fileName ?? '').trim()
  if (!raw) return ''
  return raw.replace(/[^\w.\- ]/g, '_').slice(0, 120)
}

function parseDataUrl(dataUrl?: string): { mimeType: string; buffer: Buffer } | null {
  if (!dataUrl) return null
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) return null
  const mimeType = match[1].toLowerCase()
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) return null
  try {
    const buffer = Buffer.from(match[2], 'base64')
    return { mimeType, buffer }
  } catch {
    return null
  }
}

function toVehicule(v: { id: number; immatriculation: string; modele: string; type: string; etat_actuel: string; service_type: string | null; technicien_id: number | null; responsable_id: number | null; defaut: string; client_telephone: string; date_entree: string; date_sortie: string | null; notes: string; derniere_mise_a_jour: string }) {
  return {
    id: v.id,
    immatriculation: v.immatriculation,
    modele: v.modele,
    type: v.type as 'voiture' | 'moto',
    etat_actuel: v.etat_actuel,
    service_type: v.service_type ?? undefined,
    technicien_id: v.technicien_id,
    responsable_id: v.responsable_id,
    defaut: v.defaut,
    client_telephone: v.client_telephone,
    date_entree: v.date_entree,
    date_sortie: v.date_sortie,
    notes: v.notes,
    derniere_mise_a_jour: v.derniere_mise_a_jour,
  }
}

function toHistorique(h: { id: number; vehiculeId: number; etat_precedent: string | null; etat_nouveau: string; date_changement: string; utilisateur_id: number; utilisateur_nom: string; commentaire: string; duree_etat_precedent_min: number | null; pieces_utilisees: string }) {
  return {
    id: h.id,
    vehicule_id: h.vehiculeId,
    etat_precedent: h.etat_precedent,
    etat_nouveau: h.etat_nouveau,
    date_changement: h.date_changement,
    utilisateur_id: h.utilisateur_id,
    utilisateur_nom: h.utilisateur_nom,
    commentaire: h.commentaire,
    duree_etat_precedent_minutes: h.duree_etat_precedent_min,
    pieces_utilisees: h.pieces_utilisees,
  }
}

router.get('/stats', authenticate(), async (req, res) => {
  try {
    const month = parseInt(req.query.month as string, 10)
    const year = parseInt(req.query.year as string, 10)
    const y = !isNaN(year) ? year : new Date().getFullYear()
    const m = !isNaN(month) && month >= 1 && month <= 12 ? month : new Date().getMonth() + 1
    const debut = `${y}-${String(m).padStart(2, '0')}-01`
    const fin = new Date(y, m, 0)
    const finStr = `${y}-${String(m).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}`

    const [total, enCours, byEtat, terminesCeMois] = await Promise.all([
      db.vehicule.count(),
      db.vehicule.count({ where: { etat_actuel: { notIn: ['vert', 'retour'] } } }),
      db.vehicule.groupBy({
        by: ['etat_actuel'],
        _count: { id: true },
      }),
      db.vehiculeHistorique.count({
        where: {
          etat_nouveau: 'vert',
          date_changement: { gte: debut, lte: finStr + 'T23:59:59.999Z' },
        },
      }),
    ])
    const byEtatMap: Record<string, number> = {}
    for (const row of byEtat) {
      byEtatMap[row.etat_actuel] = row._count.id
    }
    return res.json({ total, enCours, byEtat: byEtatMap, terminesCeMois })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/', authenticate(), async (req, res) => {
  try {
    const etat = req.query.etat as string | undefined
    const technicien_id = req.query.technicien_id as string | undefined
    const type = req.query.type as string | undefined
    const date_debut = req.query.date_debut as string | undefined
    const date_fin = req.query.date_fin as string | undefined
    const q = (req.query.q as string)?.trim()
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20))

    const where: Record<string, unknown> = {}
    if (etat && ETATS.includes(etat as (typeof ETATS)[number])) {
      where.etat_actuel = etat
    }
    if (technicien_id) {
      const tid = parseInt(technicien_id, 10)
      if (!isNaN(tid)) where.technicien_id = tid
    }
    if (type && TYPES.includes(type as (typeof TYPES)[number])) {
      where.type = type
    }
    if (date_debut || date_fin) {
      where.date_entree = {}
      if (date_debut) (where.date_entree as Record<string, string>).gte = date_debut
      if (date_fin) (where.date_entree as Record<string, string>).lte = date_fin
    }
    if (q) {
      where.OR = [
        { modele: { contains: q, mode: 'insensitive' } },
        { immatriculation: { contains: q, mode: 'insensitive' } },
        { defaut: { contains: q, mode: 'insensitive' } },
      ]
    }

    const [list, total] = await Promise.all([
      db.vehicule.findMany({
        where: Object.keys(where).length ? where : undefined,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.vehicule.count({
        where: Object.keys(where).length ? where : undefined,
      }),
    ])
    return res.json({ data: list.map(toVehicule), total, page, limit })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id/historique', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const list = await db.vehiculeHistorique.findMany({
      where: { vehiculeId: id },
      orderBy: { date_changement: 'asc' },
    })
    return res.json(list.map(toHistorique))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const v = await db.vehicule.findUnique({ where: { id } })
    if (!v) return res.status(404).json({ error: 'Véhicule introuvable' })
    return res.json(toVehicule(v))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id/images', authenticate(), async (req, res) => {
  try {
    if (!db.vehiculeImage) {
      return res.status(500).json({
        error:
          "Prisma client n'est pas à jour pour VehiculeImage. Arrête le backend, exécute `cd backend && npx prisma generate`, puis relance.",
      })
    }
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })

    const existing = await db.vehicule.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Véhicule introuvable' })

    const images = await db.vehiculeImage.findMany({
      where: { vehiculeId: id },
      orderBy: { createdAt: 'desc' },
    })
    return res.json(images.map(toVehiculeImage))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/:id/images', authenticate(), async (req: AuthRequest, res) => {
  try {
    if (!db.vehiculeImage) {
      return res.status(500).json({
        error:
          "Prisma client n'est pas à jour pour VehiculeImage. Arrête le backend, exécute `cd backend && npx prisma generate`, puis relance.",
      })
    }
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })

    const body = req.body as { dataUrl?: string; fileName?: string; category?: string; note?: string }
    const parsed = parseDataUrl(body.dataUrl)
    if (!parsed) {
      return res.status(400).json({ error: "Image invalide (format attendu: data URL base64 JPEG/PNG/WEBP/HEIC)." })
    }
    if (parsed.buffer.length > MAX_IMAGE_BYTES) {
      return res.status(400).json({ error: 'Image trop lourde (max 8 MB).' })
    }

    const vehicule = await db.vehicule.findUnique({ where: { id } })
    if (!vehicule) return res.status(404).json({ error: 'Véhicule introuvable' })

    const category =
      body.category && IMAGE_CATEGORIES.includes(body.category as (typeof IMAGE_CATEGORIES)[number])
        ? body.category
        : 'etat_exterieur'
    const note = (body.note ?? '').trim().slice(0, 500)
    const originalName = sanitizeOriginalName(body.fileName)
    const ext = getImageExtension(parsed.mimeType)
    const generatedName = `${Date.now()}-${Math.floor(Math.random() * 1e9)}.${ext}`

    const vehiculeDir = path.join(UPLOADS_ROOT, String(id))
    await fs.mkdir(vehiculeDir, { recursive: true })
    const diskPath = path.join(vehiculeDir, generatedName)
    await fs.writeFile(diskPath, parsed.buffer)

    const created = await db.vehiculeImage.create({
      data: {
        vehiculeId: id,
        url_path: `/uploads/vehicules/${id}/${generatedName}`,
        original_name: originalName,
        mime_type: parsed.mimeType,
        size_bytes: parsed.buffer.length,
        category,
        note,
        created_by_id: req.user?.sub ?? null,
        created_by: req.user?.fullName ?? req.user?.email ?? '',
      },
    })

    return res.status(201).json(toVehiculeImage(created))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id/images/:imageId', authenticate(), async (req, res) => {
  try {
    if (!db.vehiculeImage) {
      return res.status(500).json({
        error:
          "Prisma client n'est pas à jour pour VehiculeImage. Arrête le backend, exécute `cd backend && npx prisma generate`, puis relance.",
      })
    }
    const id = Number(req.params.id)
    const imageId = Number(req.params.imageId)
    if (isNaN(id) || isNaN(imageId)) return res.status(400).json({ error: 'ID invalide' })

    const image = await db.vehiculeImage.findFirst({
      where: { id: imageId, vehiculeId: id },
    })
    if (!image) return res.status(404).json({ error: 'Photo introuvable' })

    const relativePath = String(image.url_path).startsWith('/uploads/')
      ? String(image.url_path).replace('/uploads/', '')
      : String(image.url_path)
    const diskPath = path.join(path.resolve(process.cwd(), 'uploads'), relativePath)

    await db.vehiculeImage.delete({ where: { id: imageId } })
    await fs.unlink(diskPath).catch(() => undefined)

    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', authenticate(), async (req: AuthRequest, res) => {
  try {
    const body = req.body as {
      immatriculation?: string
      modele?: string
      type?: string
      etat_initial?: string
      date_entree?: string
      defaut?: string
      service_type?: string
      technicien_id?: number | null
      responsable_id?: number | null
      client_telephone?: string
      notes?: string
    }
    if (!body.modele || !body.date_entree) {
      return res.status(400).json({ error: 'modele et date_entree sont requis' })
    }
    const now = new Date().toISOString()
    const etat = body.etat_initial && ETATS.includes(body.etat_initial as (typeof ETATS)[number]) ? body.etat_initial : 'orange'
    const type = body.type && TYPES.includes(body.type as (typeof TYPES)[number]) ? body.type : 'voiture'

    const v = await db.vehicule.create({
      data: {
        immatriculation: (body.immatriculation ?? '').trim(),
        modele: body.modele.trim(),
        type,
        etat_actuel: etat,
        service_type: (body.service_type ?? 'autre').trim() || 'autre',
        technicien_id: body.technicien_id ?? null,
        responsable_id: body.responsable_id ?? null,
        defaut: (body.defaut ?? '').trim(),
        client_telephone: (body.client_telephone ?? '').trim(),
        date_entree: body.date_entree,
        date_sortie: null,
        notes: (body.notes ?? '').trim(),
        derniere_mise_a_jour: now,
      },
    })

    const user = req.user
    if (user) {
      await db.vehiculeHistorique.create({
        data: {
          vehiculeId: v.id,
          etat_precedent: null,
          etat_nouveau: etat,
          date_changement: now,
          utilisateur_id: user.sub,
          utilisateur_nom: user.fullName ?? user.email,
          commentaire: `Réception du véhicule - ${body.defaut ?? ''}`,
          duree_etat_precedent_min: null,
          pieces_utilisees: '',
        },
      })
    }

    return res.status(201).json(toVehicule(v))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', authenticate(), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const body = req.body as Partial<{
      immatriculation: string
      modele: string
      type: string
      defaut: string
      service_type: string
      technicien_id: number | null
      responsable_id: number | null
      client_telephone: string
      notes: string
      date_entree: string
    }>

    const existing = await db.vehicule.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Véhicule introuvable' })

    const data: Record<string, unknown> = { derniere_mise_a_jour: new Date().toISOString() }
    if (body.immatriculation != null) data.immatriculation = body.immatriculation
    if (body.modele != null) data.modele = body.modele
    if (body.type != null && TYPES.includes(body.type as (typeof TYPES)[number])) data.type = body.type
    if (body.defaut != null) data.defaut = body.defaut
    if (body.service_type != null) data.service_type = body.service_type
    if (body.technicien_id !== undefined) data.technicien_id = body.technicien_id
    if (body.responsable_id !== undefined) data.responsable_id = body.responsable_id
    if (body.client_telephone != null) data.client_telephone = body.client_telephone
    if (body.notes != null) data.notes = body.notes
    if (body.date_entree != null) data.date_entree = body.date_entree

    const v = await db.vehicule.update({ where: { id }, data })
    return res.json(toVehicule(v))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await db.vehicule.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Véhicule introuvable' })
    await db.vehicule.delete({ where: { id } })
    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/:id/changer-etat', authenticate(), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const body = req.body as { nouvel_etat?: string; commentaire?: string; pieces_utilisees?: string }
    if (!body.nouvel_etat || !ETATS.includes(body.nouvel_etat as (typeof ETATS)[number])) {
      return res.status(400).json({ error: 'nouvel_etat invalide' })
    }

    const vehicule = await db.vehicule.findUnique({ where: { id } })
    if (!vehicule) return res.status(404).json({ error: 'Véhicule introuvable' })

    const allowed = TRANSITIONS[vehicule.etat_actuel]
    if (!allowed || !allowed.includes(body.nouvel_etat)) {
      return res.status(400).json({ error: 'Transition non autorisée' })
    }

    const user = req.user
    if (!user) return res.status(401).json({ error: 'Authentification requise' })

    const now = new Date().toISOString()
    const lastHist = await db.vehiculeHistorique.findFirst({
      where: { vehiculeId: id },
      orderBy: { date_changement: 'desc' },
    })
    let duree: number | null = null
    if (lastHist) {
      duree = Math.round((new Date(now).getTime() - new Date(lastHist.date_changement).getTime()) / 60000)
    }

    const dateSortie = body.nouvel_etat === 'vert' ? now.split('T')[0] : null

    await db.$transaction([
      db.vehicule.update({
        where: { id },
        data: {
          etat_actuel: body.nouvel_etat,
          derniere_mise_a_jour: now,
          date_sortie: dateSortie ?? undefined,
        },
      }),
      db.vehiculeHistorique.create({
        data: {
          vehiculeId: id,
          etat_precedent: vehicule.etat_actuel,
          etat_nouveau: body.nouvel_etat,
          date_changement: now,
          utilisateur_id: user.sub,
          utilisateur_nom: user.fullName ?? user.email,
          commentaire: (body.commentaire ?? '').trim(),
          duree_etat_precedent_min: duree,
          pieces_utilisees: (body.pieces_utilisees ?? '').trim(),
        },
      }),
    ])

    const updated = await db.vehicule.findUnique({ where: { id } })
    return res.json(toVehicule(updated!))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
