import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'

const router = Router()

const ROLES = ['admin', 'responsable', 'technicien', 'financier'] as const

function isAdmin(req: AuthRequest): boolean {
  return req.user?.role === 'admin'
}

type UserRow = { id: number; email: string; fullName: string; telephone?: string; role: string; permissions?: unknown; statut?: string; createdAt: Date }

router.get('/', authenticate(), async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        telephone: true,
        role: true,
        permissions: true,
        statut: true,
        createdAt: true,
      } as Record<string, boolean>,
    })
    const mapped = (users as unknown as UserRow[]).map(u => ({
      id: u.id,
      email: u.email,
      nom_complet: u.fullName,
      telephone: u.telephone ?? '',
      role: ROLES.includes(u.role as (typeof ROLES)[number]) ? u.role : 'technicien',
      permissions: (u.permissions as object) ?? {},
      statut: u.statut === 'inactif' ? 'inactif' : 'actif',
      date_creation: u.createdAt.toISOString().slice(0, 10),
      derniere_connexion: null,
    }))
    return res.json(mapped)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', authenticate(), async (req: AuthRequest, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' })
  }
  try {
    const { email, password, fullName, telephone, role, permissions } = req.body as {
      email?: string
      password?: string
      fullName?: string
      telephone?: string
      role?: string
      permissions?: object
    }
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'email, password et fullName sont requis' })
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
    if (existing) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' })
    }

    const r = role && ROLES.includes(role as (typeof ROLES)[number]) ? role : 'technicien'
    const perms = permissions && typeof permissions === 'object' ? permissions : {}
    const hash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        password: hash,
        fullName: fullName.trim(),
        telephone: (telephone ?? '').trim(),
        role: r,
        permissions: perms,
        statut: 'actif',
      } as any,
    })

    const u = user as UserRow
    return res.status(201).json({
      id: u.id,
      email: u.email,
      nom_complet: u.fullName,
      telephone: u.telephone ?? '',
      role: u.role,
      permissions: (u.permissions as object) ?? {},
      statut: 'actif',
      date_creation: user.createdAt.toISOString().slice(0, 10),
      derniere_connexion: null,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', authenticate(), async (req: AuthRequest, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' })
  }
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })

    const { fullName, telephone, role, permissions, statut, password } = req.body as {
      fullName?: string
      telephone?: string
      role?: string
      permissions?: object
      statut?: string
      password?: string
    }

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Utilisateur introuvable' })

    const data: Record<string, unknown> = {}
    if (fullName != null) data.fullName = String(fullName).trim()
    if (telephone != null) data.telephone = String(telephone).trim()
    if (role && ROLES.includes(role as (typeof ROLES)[number])) data.role = role
    if (permissions && typeof permissions === 'object') data.permissions = permissions
    if (statut === 'inactif' || statut === 'actif') data.statut = statut
    if (password && password.length >= 6) {
      data.password = await bcrypt.hash(password, 10)
    }

    const user = await prisma.user.update({
      where: { id },
      data,
    }) as UserRow

    return res.json({
      id: user.id,
      email: user.email,
      nom_complet: user.fullName,
      telephone: user.telephone ?? '',
      role: user.role,
      permissions: (user.permissions as object) ?? {},
      statut: user.statut ?? 'actif',
      date_creation: user.createdAt.toISOString().slice(0, 10),
      derniere_connexion: null,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
