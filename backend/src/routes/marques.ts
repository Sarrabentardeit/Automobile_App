import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'
import {
  brandToSlug,
  clearMarqueLogo,
  refreshBrandCache,
  saveMarqueLogo,
  titleBrand,
} from '../lib/vehiculeBrands'

const router = Router()
const db = prisma as any

function canManageMarques(req: AuthRequest): boolean {
  const role = req.user?.role
  if (role === 'admin' || role === 'responsable') return true
  const perms = (req.user as { permissions?: { canEditVehicule?: boolean; canManageUsers?: boolean } })
    ?.permissions
  return Boolean(perms?.canEditVehicule || perms?.canManageUsers)
}

function toDto(m: {
  id: number
  nom: string
  slug: string
  logoUrl: string | null
  actif: boolean
  createdAt?: Date
  updatedAt?: Date
}) {
  return {
    id: m.id,
    nom: m.nom,
    slug: m.slug,
    logoUrl: m.logoUrl ?? null,
    actif: m.actif !== false,
    createdAt: m.createdAt?.toISOString?.() ?? undefined,
    updatedAt: m.updatedAt?.toISOString?.() ?? undefined,
  }
}

/** Liste des marques (actifs par défaut, ?all=1 pour tout). */
router.get('/', authenticate(), async (req, res) => {
  try {
    const all = String(req.query.all ?? '') === '1'
    const where = all ? undefined : { actif: true }
    const rows = await db.marque.findMany({
      where,
      orderBy: { nom: 'asc' },
    })
    return res.json({ data: rows.map(toDto) })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', authenticate(), async (req: AuthRequest, res) => {
  try {
    if (!canManageMarques(req)) return res.status(403).json({ error: 'Accès refusé' })
    const nom = titleBrand(String(req.body?.nom ?? '').trim())
    if (!nom) return res.status(400).json({ error: 'Nom de marque requis' })
    const slug = brandToSlug(nom)
    if (!slug) return res.status(400).json({ error: 'Nom de marque invalide' })

    const exists = await db.marque.findFirst({
      where: { OR: [{ nom: { equals: nom, mode: 'insensitive' } }, { slug }] },
    })
    if (exists) return res.status(409).json({ error: 'Cette marque existe déjà' })

    let created = await db.marque.create({
      data: { nom, slug, logoUrl: null, actif: true },
    })

    const logoDataUrl = typeof req.body?.logoDataUrl === 'string' ? req.body.logoDataUrl : null
    if (logoDataUrl) {
      try {
        const logoUrl = await saveMarqueLogo(created.id, logoDataUrl)
        created = await db.marque.update({ where: { id: created.id }, data: { logoUrl } })
      } catch (e) {
        return res.status(400).json({
          error: e instanceof Error ? e.message : 'Logo invalide',
          data: toDto(created),
        })
      }
    }

    await refreshBrandCache()
    return res.status(201).json(toDto(created))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', authenticate(), async (req: AuthRequest, res) => {
  try {
    if (!canManageMarques(req)) return res.status(403).json({ error: 'Accès refusé' })
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID invalide' })

    const existing = await db.marque.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Marque introuvable' })

    const data: Record<string, unknown> = {}
    if (req.body?.nom != null) {
      const nom = titleBrand(String(req.body.nom).trim())
      if (!nom) return res.status(400).json({ error: 'Nom de marque requis' })
      const slug = brandToSlug(nom)
      const clash = await db.marque.findFirst({
        where: {
          id: { not: id },
          OR: [{ nom: { equals: nom, mode: 'insensitive' } }, { slug }],
        },
      })
      if (clash) return res.status(409).json({ error: 'Cette marque existe déjà' })
      data.nom = nom
      data.slug = slug
    }
    if (req.body?.actif !== undefined) data.actif = Boolean(req.body.actif)

    if (req.body?.removeLogo === true) {
      await clearMarqueLogo(id)
      data.logoUrl = null
    } else if (typeof req.body?.logoDataUrl === 'string' && req.body.logoDataUrl) {
      try {
        data.logoUrl = await saveMarqueLogo(id, req.body.logoDataUrl)
      } catch (e) {
        return res.status(400).json({ error: e instanceof Error ? e.message : 'Logo invalide' })
      }
    }

    const updated = await db.marque.update({ where: { id }, data })
    await refreshBrandCache()
    return res.json(toDto(updated))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', authenticate(), async (req: AuthRequest, res) => {
  try {
    if (!canManageMarques(req)) return res.status(403).json({ error: 'Accès refusé' })
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID invalide' })

    const existing = await db.marque.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Marque introuvable' })

    // Désactive plutôt que supprimer (les véhicules restent classés)
    const updated = await db.marque.update({
      where: { id },
      data: { actif: false },
    })
    await refreshBrandCache()
    return res.json(toDto(updated))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
