import { Router } from 'express'
import bcrypt from 'bcryptjs'
import fs from 'fs/promises'
import path from 'path'
import { prisma } from '../lib/prisma'
import { migrateTeamMoneyOnUserRename } from '../lib/teamMoneyMigrate'
import { authenticate, type AuthRequest } from '../middleware/auth'

const router = Router()

const ROLES = ['admin', 'responsable', 'technicien', 'financier'] as const
const AVATARS_ROOT = path.resolve(process.cwd(), 'uploads', 'avatars')
const ALLOWED_AVATAR_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const

function isAdmin(req: AuthRequest): boolean {
  return req.user?.role === 'admin'
}

type UserRow = {
  id: number
  email: string
  fullName: string
  telephone?: string
  role: string
  permissions?: unknown
  statut?: string
  avatarUrl?: string | null
  createdAt: Date
}

function mapUserPublic(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    nom_complet: u.fullName,
    fullName: u.fullName,
    telephone: u.telephone ?? '',
    role: ROLES.includes(u.role as (typeof ROLES)[number]) ? u.role : 'technicien',
    permissions: (u.permissions as object) ?? {},
    statut: u.statut === 'inactif' ? 'inactif' : 'actif',
    avatarUrl: u.avatarUrl ?? null,
    date_creation: u.createdAt.toISOString().slice(0, 10),
    derniere_connexion: null,
  }
}

function parseAvatarDataUrl(dataUrl?: string): { mimeType: string; buffer: Buffer; ext: string } | null {
  if (!dataUrl) return null
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) return null
  let mimeType = match[1].toLowerCase()
  if (mimeType === 'image/jpg' || mimeType === 'image/pjpeg') mimeType = 'image/jpeg'
  if (!ALLOWED_AVATAR_MIME.includes(mimeType as (typeof ALLOWED_AVATAR_MIME)[number])) return null
  try {
    const buffer = Buffer.from(match[2], 'base64')
    if (buffer.length > 5 * 1024 * 1024) return null
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
    return { mimeType, buffer, ext }
  } catch {
    return null
  }
}

async function clearAvatarFiles(userId: number): Promise<void> {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    await fs.unlink(path.join(AVATARS_ROOT, `${userId}.${ext}`)).catch(() => undefined)
  }
}

async function saveAvatar(userId: number, dataUrl: string): Promise<string> {
  const parsed = parseAvatarDataUrl(dataUrl)
  if (!parsed) throw new Error('Image invalide (JPEG/PNG/WebP, max 5 Mo)')
  await fs.mkdir(AVATARS_ROOT, { recursive: true })
  await clearAvatarFiles(userId)
  const fileName = `${userId}.${parsed.ext}`
  await fs.writeFile(path.join(AVATARS_ROOT, fileName), parsed.buffer)
  return `/uploads/avatars/${fileName}`
}

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
        avatarUrl: true,
        createdAt: true,
      } as Record<string, boolean>,
    })
    const mapped = (users as unknown as UserRow[]).map(mapUserPublic)
    return res.json(mapped)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** GET /users/me — profil connecté */
router.get('/me', authenticate(), async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.sub
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        telephone: true,
        role: true,
        permissions: true,
        statut: true,
        avatarUrl: true,
        createdAt: true,
      } as Record<string, boolean>,
    })
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })
    return res.json(mapUserPublic(user as unknown as UserRow))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** PATCH /users/me — modifier nom / téléphone / photo (self-service) */
router.patch('/me', authenticate(), async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.sub
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const body = req.body as {
      fullName?: string
      telephone?: string
      avatarDataUrl?: string | null
      removeAvatar?: boolean
    }

    const existing = await prisma.user.findUnique({ where: { id: userId } })
    if (!existing) return res.status(404).json({ error: 'Utilisateur introuvable' })

    const data: Record<string, unknown> = {}
    if (body.fullName != null) {
      const name = String(body.fullName).trim()
      if (name.length < 2) return res.status(400).json({ error: 'Nom trop court' })
      data.fullName = name
    }
    if (body.telephone != null) data.telephone = String(body.telephone).trim()

    if (body.removeAvatar) {
      await clearAvatarFiles(userId)
      data.avatarUrl = null
    } else if (typeof body.avatarDataUrl === 'string' && body.avatarDataUrl.startsWith('data:')) {
      try {
        data.avatarUrl = await saveAvatar(userId, body.avatarDataUrl)
      } catch (e) {
        return res.status(400).json({
          error: e instanceof Error ? e.message : 'Image invalide',
        })
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Aucune modification' })
    }

    const user = (await prisma.user.update({
      where: { id: userId },
      data,
    })) as UserRow

    if (data.fullName != null && String(data.fullName) !== existing.fullName) {
      try {
        await migrateTeamMoneyOnUserRename(userId, existing.fullName, String(data.fullName))
      } catch (e) {
        console.error('[users] migrateTeamMoneyOnUserRename:', e)
      }
    }

    return res.json(mapUserPublic(user))
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

    return res.status(201).json(mapUserPublic(user as UserRow))
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

    if (fullName != null && String(fullName).trim() !== existing.fullName) {
      try {
        await migrateTeamMoneyOnUserRename(id, existing.fullName, String(fullName).trim())
      } catch (e) {
        console.error('[users] migrateTeamMoneyOnUserRename:', e)
      }
    }

    return res.json(mapUserPublic(user))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', authenticate(), async (req: AuthRequest, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' })
  }

  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' })

    // évite de supprimer l'utilisateur connecté par erreur
    if (req.user?.sub === id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' })
    }

    // garde-fou: ne pas supprimer le dernier admin
    if (target.role === 'admin') {
      const adminCount = await prisma.user.count({ where: { role: 'admin' } })
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Impossible de supprimer le dernier administrateur' })
      }
    }

    await prisma.user.delete({ where: { id } })
    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** POST /users/me/push-token — enregistre le token Expo Push */
router.post('/me/push-token', authenticate(), async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.sub
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const token = String((req.body as { token?: string })?.token ?? '').trim()
    if (!token) return res.status(400).json({ error: 'token requis' })

    await prisma.user.update({
      where: { id: userId },
      data: { expoPushToken: token } as { expoPushToken: string },
    })
    return res.json({ ok: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** DELETE /users/me/push-token */
router.delete('/me/push-token', authenticate(), async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.sub
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    await prisma.user.update({
      where: { id: userId },
      data: { expoPushToken: null } as { expoPushToken: null },
    })
    return res.json({ ok: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
