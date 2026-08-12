import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'

const router = Router()
const db = prisma as any

const LEGACY_TEAM_CHANNEL_TITLE = 'Équipe EL MECANO'
const MESSAGE_MAX = 4000
const TITLE_MAX = 80
const LIST_LIMIT = 50

function userLabel(u: { fullName?: string | null; email?: string | null; id: number }) {
  return (u.fullName || u.email || `User #${u.id}`).trim()
}

function isGroupType(type: string) {
  return type === 'group' || type === 'channel'
}

/** Supprime l’ancien canal fixe « Équipe EL MECANO » s’il existe encore. */
async function removeLegacyTeamChannel() {
  await db.chatConversation.deleteMany({
    where: {
      OR: [
        { type: 'channel', title: LEGACY_TEAM_CHANNEL_TITLE },
        { type: 'group', title: LEGACY_TEAM_CHANNEL_TITLE },
      ],
    },
  })
}

async function assertParticipant(conversationId: number, userId: number) {
  const p = await db.chatParticipant.findUnique({
    where: {
      conversationId_userId: { conversationId, userId },
    },
  })
  return p != null
}

const conversationInclude = {
  participants: {
    include: {
      user: { select: { id: true, fullName: true, email: true, role: true } },
    },
  },
  messages: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    include: { sender: { select: { id: true, fullName: true } } },
  },
}

function serializeConversation(
  c: {
    id: number
    type: string
    title: string
    updatedAt: Date
    participants: Array<{
      userId: number
      lastReadAt: Date | null
      user: { id: number; fullName: string; email: string; role: string }
    }>
    messages: Array<{
      id: number
      body: string
      createdAt: Date
      senderId: number
      sender: { id: number; fullName: string }
    }>
  },
  me: number
) {
  const others = c.participants.filter(p => p.userId !== me)
  const mePart = c.participants.find(p => p.userId === me)
  const last = c.messages[0] ?? null
  const lastRead = mePart?.lastReadAt ? new Date(mePart.lastReadAt) : null

  const type = isGroupType(c.type) ? 'group' : 'direct'
  let title = c.title
  if (type === 'direct') {
    title = others.map(p => userLabel(p.user)).join(', ') || 'Conversation'
  } else if (!title.trim()) {
    title = 'Groupe'
  }

  return {
    id: c.id,
    type: type as 'group' | 'direct',
    title,
    updatedAt: c.updatedAt.toISOString(),
    participants: c.participants.map(p => ({
      userId: p.userId,
      nom: userLabel(p.user),
      role: p.user.role,
      lastReadAt: p.lastReadAt?.toISOString() ?? null,
    })),
    lastMessage: last
      ? {
          id: last.id,
          body: last.body,
          createdAt: last.createdAt.toISOString(),
          senderId: last.senderId,
          senderNom: userLabel(last.sender),
        }
      : null,
    unreadCount: 0 as number,
    _lastReadAt: lastRead,
  }
}

async function loadConversation(id: number, me: number) {
  const row = await db.chatConversation.findUnique({
    where: { id },
    include: conversationInclude,
  })
  if (!row) return null
  const base = serializeConversation(row, me)
  const { _lastReadAt: _, ...rest } = base
  return { ...rest, unreadCount: 0 }
}

/** Liste des conversations de l'utilisateur. */
router.get('/conversations', authenticate(), async (req: AuthRequest, res) => {
  try {
    const me = req.user!.sub
    await removeLegacyTeamChannel()

    const rows = await db.chatConversation.findMany({
      where: { participants: { some: { userId: me } } },
      include: conversationInclude,
      orderBy: { updatedAt: 'desc' },
    })

    const data = await Promise.all(
      rows.map(async (c: Parameters<typeof serializeConversation>[0]) => {
        const base = serializeConversation(c, me)
        const lastRead = base._lastReadAt
        const unreadCount = await db.chatMessage.count({
          where: {
            conversationId: c.id,
            senderId: { not: me },
            ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
          },
        })
        const { _lastReadAt: _, ...rest } = base
        return { ...rest, unreadCount }
      })
    )

    data.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))

    return res.json({ data })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** Tous les comptes utilisateurs pour DM / groupes. */
router.get('/members', authenticate(), async (req: AuthRequest, res) => {
  try {
    const me = req.user!.sub
    const users = await db.user.findMany({
      where: { id: { not: me } },
      select: { id: true, fullName: true, email: true, role: true, statut: true },
      orderBy: [{ statut: 'asc' }, { fullName: 'asc' }],
    })
    return res.json({
      data: users.map(
        (u: { id: number; fullName: string; email: string; role: string; statut: string }) => ({
          id: u.id,
          nom: userLabel(u),
          role: u.role,
          email: u.email,
          statut: u.statut === 'inactif' ? 'inactif' : 'actif',
        })
      ),
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** Ouvre ou crée un message privé entre deux comptes User. */
router.post('/conversations/direct', authenticate(), async (req: AuthRequest, res) => {
  try {
    const me = req.user!.sub
    const otherId = Number(req.body?.userId)
    if (!Number.isInteger(otherId) || otherId <= 0 || otherId === me) {
      return res.status(400).json({ error: 'userId invalide' })
    }
    const other = await db.user.findFirst({
      where: { id: otherId },
      select: { id: true },
    })
    if (!other) return res.status(404).json({ error: 'Utilisateur introuvable' })

    const mine = await db.chatParticipant.findMany({
      where: { userId: me, conversation: { type: 'direct' } },
      select: { conversationId: true },
    })
    const mineIds = mine.map((p: { conversationId: number }) => p.conversationId)
    if (mineIds.length) {
      const existing = await db.chatConversation.findFirst({
        where: {
          id: { in: mineIds },
          type: 'direct',
          participants: { some: { userId: otherId } },
        },
        include: conversationInclude,
      })
      if (existing) {
        const base = serializeConversation(existing, me)
        const { _lastReadAt: _, ...rest } = base
        return res.json({ data: { ...rest, unreadCount: 0 } })
      }
    }

    const created = await db.chatConversation.create({
      data: {
        type: 'direct',
        title: '',
        participants: {
          create: [{ userId: me }, { userId: otherId }],
        },
      },
      include: conversationInclude,
    })
    const base = serializeConversation(created, me)
    const { _lastReadAt: _, ...rest } = base
    return res.status(201).json({ data: { ...rest, unreadCount: 0 } })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** Crée un groupe avec un titre et des membres. */
router.post('/conversations/group', authenticate(), async (req: AuthRequest, res) => {
  try {
    const me = req.user!.sub
    const title = String(req.body?.title ?? '').trim()
    if (!title) return res.status(400).json({ error: 'Titre du groupe requis' })
    if (title.length > TITLE_MAX) {
      return res.status(400).json({ error: `Titre trop long (max ${TITLE_MAX})` })
    }

    const rawIds = Array.isArray(req.body?.memberIds) ? req.body.memberIds : []
    const memberIds = [
      ...new Set(
        rawIds
          .map((x: unknown) => Number(x))
          .filter((id: number) => Number.isInteger(id) && id > 0 && id !== me)
      ),
    ] as number[]

    if (memberIds.length < 1) {
      return res.status(400).json({ error: 'Ajoutez au moins un membre' })
    }

    const found = await db.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true },
    })
    if (found.length !== memberIds.length) {
      return res.status(400).json({ error: 'Un ou plusieurs utilisateurs introuvables' })
    }

    const created = await db.chatConversation.create({
      data: {
        type: 'group',
        title,
        participants: {
          create: [{ userId: me }, ...memberIds.map(userId => ({ userId }))],
        },
      },
      include: conversationInclude,
    })
    const base = serializeConversation(created, me)
    const { _lastReadAt: _, ...rest } = base
    return res.status(201).json({ data: { ...rest, unreadCount: 0 } })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** Ajoute des membres à un groupe. */
router.post('/conversations/:id/members', authenticate(), async (req: AuthRequest, res) => {
  try {
    const me = req.user!.sub
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id invalide' })
    if (!(await assertParticipant(id, me))) {
      return res.status(403).json({ error: 'Accès refusé' })
    }

    const conv = await db.chatConversation.findUnique({ where: { id } })
    if (!conv) return res.status(404).json({ error: 'Conversation introuvable' })
    if (!isGroupType(conv.type)) {
      return res.status(400).json({ error: 'Réservé aux groupes' })
    }

    const rawIds = Array.isArray(req.body?.userIds) ? req.body.userIds : []
    const userIds = [
      ...new Set(
        rawIds
          .map((x: unknown) => Number(x))
          .filter((uid: number) => Number.isInteger(uid) && uid > 0)
      ),
    ] as number[]

    if (!userIds.length) {
      return res.status(400).json({ error: 'userIds requis' })
    }

    const found = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true },
    })
    if (found.length !== userIds.length) {
      return res.status(400).json({ error: 'Un ou plusieurs utilisateurs introuvables' })
    }

    await db.chatParticipant.createMany({
      data: userIds.map(userId => ({ conversationId: id, userId })),
      skipDuplicates: true,
    })

    // Normalise type legacy channel → group
    if (conv.type === 'channel') {
      await db.chatConversation.update({ where: { id }, data: { type: 'group' } })
    }

    const data = await loadConversation(id, me)
    return res.json({ data })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** Retire un membre d’un groupe. */
router.delete('/conversations/:id/members/:userId', authenticate(), async (req: AuthRequest, res) => {
  try {
    const me = req.user!.sub
    const id = Number(req.params.id)
    const targetId = Number(req.params.userId)
    if (!Number.isInteger(id) || !Number.isInteger(targetId)) {
      return res.status(400).json({ error: 'id invalide' })
    }
    if (!(await assertParticipant(id, me))) {
      return res.status(403).json({ error: 'Accès refusé' })
    }

    const conv = await db.chatConversation.findUnique({ where: { id } })
    if (!conv) return res.status(404).json({ error: 'Conversation introuvable' })
    if (!isGroupType(conv.type)) {
      return res.status(400).json({ error: 'Réservé aux groupes' })
    }

    const count = await db.chatParticipant.count({ where: { conversationId: id } })
    if (count <= 1 && targetId === me) {
      return res.status(400).json({ error: 'Impossible de quitter le dernier membre' })
    }

    await db.chatParticipant.deleteMany({
      where: { conversationId: id, userId: targetId },
    })

    if (targetId === me) {
      return res.json({ data: null, left: true })
    }

    const data = await loadConversation(id, me)
    return res.json({ data })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** Messages d'une conversation. */
router.get('/conversations/:id/messages', authenticate(), async (req: AuthRequest, res) => {
  try {
    const me = req.user!.sub
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id invalide' })
    if (!(await assertParticipant(id, me))) {
      return res.status(403).json({ error: 'Accès refusé' })
    }

    const before = typeof req.query.before === 'string' ? req.query.before : undefined
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || LIST_LIMIT))

    const messages = await db.chatMessage.findMany({
      where: {
        conversationId: id,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: { select: { id: true, fullName: true, email: true } },
      },
    })

    const data = messages
      .map(
        (m: {
          id: number
          body: string
          createdAt: Date
          senderId: number
          sender: { id: number; fullName: string; email: string }
        }) => ({
          id: m.id,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
          senderId: m.senderId,
          senderNom: userLabel(m.sender),
          mine: m.senderId === me,
        })
      )
      .reverse()

    return res.json({ data })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** Envoyer un message. */
router.post('/conversations/:id/messages', authenticate(), async (req: AuthRequest, res) => {
  try {
    const me = req.user!.sub
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id invalide' })
    if (!(await assertParticipant(id, me))) {
      return res.status(403).json({ error: 'Accès refusé' })
    }

    const body = String(req.body?.body ?? '').trim()
    if (!body) return res.status(400).json({ error: 'Message vide' })
    if (body.length > MESSAGE_MAX) {
      return res.status(400).json({ error: `Message trop long (max ${MESSAGE_MAX})` })
    }

    const msg = await db.chatMessage.create({
      data: { conversationId: id, senderId: me, body },
      include: { sender: { select: { id: true, fullName: true, email: true } } },
    })
    await db.chatConversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    })
    await db.chatParticipant.update({
      where: { conversationId_userId: { conversationId: id, userId: me } },
      data: { lastReadAt: new Date() },
    })

    return res.status(201).json({
      data: {
        id: msg.id,
        body: msg.body,
        createdAt: msg.createdAt.toISOString(),
        senderId: msg.senderId,
        senderNom: userLabel(msg.sender),
        mine: true,
      },
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** Marquer comme lu. */
router.post('/conversations/:id/read', authenticate(), async (req: AuthRequest, res) => {
  try {
    const me = req.user!.sub
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id invalide' })
    if (!(await assertParticipant(id, me))) {
      return res.status(403).json({ error: 'Accès refusé' })
    }
    await db.chatParticipant.update({
      where: { conversationId_userId: { conversationId: id, userId: me } },
      data: { lastReadAt: new Date() },
    })
    return res.json({ ok: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
