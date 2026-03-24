import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import { env } from '../config/env'
import type { AuthPayload } from '../middleware/auth'

const router = Router()

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 // 1h
const REFRESH_TOKEN_TTL_DAYS = 30

function createTokens(user: { id: number; email: string; role: string; fullName?: string }) {
  const payload: AuthPayload = { sub: user.id, email: user.email, role: user.role, fullName: user.fullName }
  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL_SECONDS })
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d` })
  return { accessToken, refreshToken }
}

router.post('/register', async (req, res) => {
  try {
    if (!env.ALLOW_PUBLIC_REGISTRATION) {
      return res.status(403).json({ error: 'Public registration is disabled' })
    }
    const { email, password, fullName } = req.body as { email?: string; password?: string; fullName?: string }
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'email, password and fullName are required' })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' })
    }

    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      // cast en any pour ne pas dépendre des champs Prisma générés
      data: {
        email,
        password: hash,
        fullName,
        role: 'technicien',
      } as any,
    })

    const { accessToken, refreshToken } = createTokens({ ...user, fullName: user.fullName })

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS)
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    })

    const perms = ((user as any).permissions as object) ?? {}
    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        telephone: (user as any).telephone ?? '',
        permissions: perms,
      },
      accessToken,
      refreshToken
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string }
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' })
    }

    const user = await prisma.user.findUnique({ where: { email } } as any)
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const ok = await bcrypt.compare(password, user.password)
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const { accessToken, refreshToken } = createTokens({ ...user, fullName: user.fullName })
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS)
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    })

    const perms = ((user as any).permissions as object) ?? {}
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        telephone: (user as any).telephone ?? '',
        permissions: perms,
      },
      accessToken,
      refreshToken
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string }
  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken is required' })
  }

  try {
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } })
    if (!stored || stored.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' })
    }

    const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as unknown as AuthPayload
    const user = await prisma.user.findUnique({ where: { id: payload.sub } } as any)
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' })
    }

    const tokens = createTokens({ ...user, fullName: user.fullName })
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS)
    await prisma.$transaction([
      prisma.refreshToken.deleteMany({ where: { token: refreshToken } }),
      prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          userId: user.id,
          expiresAt,
        },
      }),
    ])
    return res.json(tokens)
  } catch (err) {
    console.error(err)
    return res.status(401).json({ error: 'Invalid or expired refresh token' })
  }
})

export default router

