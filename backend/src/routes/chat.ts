import { Router } from 'express'
import fs from 'fs/promises'
import path from 'path'
import { prisma } from '../lib/prisma'
import { pushChatToUsers } from '../lib/notify'
import { emitToUsers } from '../lib/realtime'
import { authenticate, type AuthRequest } from '../middleware/auth'

const router = Router()
const db = prisma as any

const LEGACY_TEAM_CHANNEL_TITLE = 'Équipe EL MECANO'
const MESSAGE_MAX = 4000
const TITLE_MAX = 80
const LIST_LIMIT = 50
const CHAT_UPLOADS = path.resolve(process.cwd(), 'uploads', 'chat')
const ALLOWED_CHAT_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const
const MAX_ATTACH_BYTES = 8 * 1024 * 1024
const MAX_ATTACHMENTS = 5

function parseDataUrl(dataUrl?: string): { mimeType: string; buffer: Buffer; ext: string } | null {
  if (!dataUrl) return null
  const match = dataUrl.match(/^data:([a-zA-Z0-9.+/-]+);base64,(.+)$/)
  if (!match) return null
  let mimeType = match[1].toLowerCase()
  if (mimeType === 'image/jpg' || mimeType === 'image/pjpeg') mimeType = 'image/jpeg'
  if (!ALLOWED_CHAT_MIME.includes(mimeType as (typeof ALLOWED_CHAT_MIME)[number])) return null
  try {
    const buffer = Buffer.from(match[2], 'base64')
    if (buffer.length > MAX_ATTACH_BYTES) return null
    const ext =
      mimeType === 'image/png'
        ? 'png'
        : mimeType === 'image/webp'
          ? 'webp'
          : mimeType === 'application/pdf'
            ? 'pdf'
            : 'jpg'
    return { mimeType, buffer, ext }
  } catch {
    return null
  }
}

function attachmentKind(mime: string): 'image' | 'file' {
  return mime.startsWith('image/') ? 'image' : 'file'
}

function mapAttachment(a: {
  id: number
  url_path: string
  original_name: string
  mime_type: string
  size_bytes: number
  kind: string
}) {
  return {
    id: a.id,
    url_path: a.url_path,
    original_name: a.original_name,
    mime_type: a.mime_type,
    size_bytes: a.size_bytes,
    kind: a.kind === 'image' ? 'image' : 'file',
  }
}

function serializeMessage(
  m: {
    id: number
    body: string
    createdAt: Date
    senderId: number
    deletedAt?: Date | null
    sender: { id: number; fullName: string; email?: string | null }
    attachments?: Array<{
      id: number
      url_path: string
      original_name: string
      mime_type: string
      size_bytes: number
      kind: string
    }>
  },
  me: number
) {
  const deleted = !!m.deletedAt
  return {
    id: m.id,
    body: deleted ? '' : m.body,
    createdAt: m.createdAt.toISOString(),
    senderId: m.senderId,
    senderNom: userLabel(m.sender),
    mine: m.senderId === me,
    deleted,
    attachments: deleted ? [] : (m.attachments ?? []).map(mapAttachment),
  }
}

function previewBody(m: {
  body?: string
  deletedAt?: Date | null
  attachments?: Array<{ kind: string }>
}): string {
  if (m.deletedAt) return 'Message supprimé'
  const body = (m.body ?? '').trim()
  if (body) return body
  const att = m.attachments?.[0]
  if (att?.kind === 'image') return '📷 Photo'
  if (att) return '📎 Pièce jointe'
  return ''
}

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
    include: {
      sender: { select: { id: true, fullName: true } },
      attachments: true,
    },
  },
  pinnedMessage: {
    include: {
      sender: { select: { id: true, fullName: true, email: true } },
      attachments: true,
    },
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
      deletedAt?: Date | null
      sender: { id: number; fullName: string }
      attachments?: Array<{ kind: string }>
    }>
    pinnedMessageId?: number | null
    pinnedAt?: Date | null
    pinnedMessage?: {
      id: number
      body: string
      createdAt: Date
      senderId: number
      deletedAt?: Date | null
      sender: { id: number; fullName: string; email?: string | null }
      attachments?: Array<{
        id: number
        url_path: string
        original_name: string
        mime_type: string
        size_bytes: number
        kind: string
      }>
    } | null
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
          body: previewBody(last),
          createdAt: last.createdAt.toISOString(),
          senderId: last.senderId,
          senderNom: userLabel(last.sender),
        }
      : null,
    pinnedMessage:
      c.pinnedMessage && !c.pinnedMessage.deletedAt
        ? serializeMessage(c.pinnedMessage, me)
        : null,
    pinnedAt: c.pinnedAt?.toISOString() ?? null,
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
            deletedAt: null,
            hides: { none: { userId: me } },
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
    const after = typeof req.query.after === 'string' ? req.query.after : undefined
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || LIST_LIMIT))

    const hidden = (await db.chatMessageHide.findMany({
      where: { userId: me },
      select: { messageId: true },
    })) as Array<{ messageId: number }>
    const hiddenIds = hidden.map((h) => h.messageId)

    const messages = await db.chatMessage.findMany({
      where: {
        conversationId: id,
        ...(hiddenIds.length ? { id: { notIn: hiddenIds } } : {}),
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
        ...(after ? { createdAt: { gt: new Date(after) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: { select: { id: true, fullName: true, email: true } },
        attachments: true,
      },
    })

    const data = messages.map((m: Parameters<typeof serializeMessage>[0]) => serializeMessage(m, me)).reverse()

    const conv = await db.chatConversation.findUnique({
      where: { id },
      include: {
        pinnedMessage: {
          include: {
            sender: { select: { id: true, fullName: true, email: true } },
            attachments: true,
          },
        },
      },
    })
    const pinned =
      conv?.pinnedMessage &&
      !conv.pinnedMessage.deletedAt &&
      !hiddenIds.includes(conv.pinnedMessage.id)
        ? serializeMessage(conv.pinnedMessage, me)
        : null

    return res.json({ data, pinnedMessage: pinned })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** Envoyer un message (+ pièces jointes optionnelles). */
router.post('/conversations/:id/messages', authenticate(), async (req: AuthRequest, res) => {
  try {
    const me = req.user!.sub
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id invalide' })
    if (!(await assertParticipant(id, me))) {
      return res.status(403).json({ error: 'Accès refusé' })
    }

    const body = String(req.body?.body ?? '').trim()
    const rawAtts = Array.isArray(req.body?.attachments) ? req.body.attachments : []
    if (rawAtts.length > MAX_ATTACHMENTS) {
      return res.status(400).json({ error: `Max ${MAX_ATTACHMENTS} pièces jointes` })
    }
    if (!body && rawAtts.length === 0) {
      return res.status(400).json({ error: 'Message vide' })
    }
    if (body.length > MESSAGE_MAX) {
      return res.status(400).json({ error: `Message trop long (max ${MESSAGE_MAX})` })
    }

    type AttIn = { dataUrl?: string; fileName?: string }
    const prepared: Array<{
      buffer: Buffer
      mimeType: string
      ext: string
      fileName: string
      kind: 'image' | 'file'
    }> = []
    for (const raw of rawAtts as AttIn[]) {
      const parsed = parseDataUrl(raw.dataUrl)
      if (!parsed) {
        return res.status(400).json({ error: 'Pièce jointe invalide (JPEG/PNG/WebP/PDF, max 8 Mo)' })
      }
      const fileName = String(raw.fileName ?? `fichier.${parsed.ext}`).slice(0, 120)
      prepared.push({
        ...parsed,
        fileName,
        kind: attachmentKind(parsed.mimeType),
      })
    }

    const msg = await db.chatMessage.create({
      data: { conversationId: id, senderId: me, body },
      include: { sender: { select: { id: true, fullName: true, email: true } } },
    })

    const savedAtts: Array<{
      id: number
      url_path: string
      original_name: string
      mime_type: string
      size_bytes: number
      kind: string
    }> = []
    if (prepared.length) {
      const dir = path.join(CHAT_UPLOADS, String(id))
      await fs.mkdir(dir, { recursive: true })
      for (let i = 0; i < prepared.length; i++) {
        const p = prepared[i]
        const diskName = `${msg.id}_${Date.now()}_${i}.${p.ext}`
        await fs.writeFile(path.join(dir, diskName), p.buffer)
        const row = await db.chatAttachment.create({
          data: {
            messageId: msg.id,
            url_path: `/uploads/chat/${id}/${diskName}`,
            original_name: p.fileName,
            mime_type: p.mimeType,
            size_bytes: p.buffer.length,
            kind: p.kind,
          },
        })
        savedAtts.push(row)
      }
    }

    await db.chatConversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    })
    await db.chatParticipant.update({
      where: { conversationId_userId: { conversationId: id, userId: me } },
      data: { lastReadAt: new Date() },
    })

    try {
      const others = (await db.chatParticipant.findMany({
        where: { conversationId: id, userId: { not: me } },
        select: { userId: true },
      })) as Array<{ userId: number }>
      const otherIds = others.map((p) => p.userId)
      emitToUsers(otherIds, {
        type: 'chat_message',
        conversationId: id,
        messageId: msg.id,
        senderId: me,
      })
      const preview = previewBody({ body, attachments: savedAtts })
      const short = preview.length > 120 ? `${preview.slice(0, 117)}…` : preview
      const senderName = userLabel(msg.sender)
      // Pas de notif cloche : déjà son + bulle chat (+ push Expo si app fermée)
      void pushChatToUsers(otherIds, {
        title: 'Nouveau message',
        message: `${senderName}: ${short}`,
        conversationId: id,
      })
    } catch (e) {
      console.warn('[chat] notify participants failed', e)
    }

    return res.status(201).json({
      data: serializeMessage(
        { ...msg, deletedAt: null, attachments: savedAtts },
        me
      ),
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** Supprimer pour tout le monde (expéditeur uniquement). */
router.delete('/messages/:messageId', authenticate(), async (req: AuthRequest, res) => {
  try {
    const me = req.user!.sub
    const messageId = Number(req.params.messageId)
    if (!Number.isInteger(messageId)) return res.status(400).json({ error: 'id invalide' })

    const msg = await db.chatMessage.findUnique({
      where: { id: messageId },
      include: { attachments: true },
    })
    if (!msg) return res.status(404).json({ error: 'Message introuvable' })
    if (!(await assertParticipant(msg.conversationId, me))) {
      return res.status(403).json({ error: 'Accès refusé' })
    }
    if (msg.senderId !== me && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Seul l’auteur peut supprimer pour tous' })
    }

    const updated = await db.chatMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), deletedById: me, body: '' },
      include: {
        sender: { select: { id: true, fullName: true, email: true } },
        attachments: true,
      },
    })

    // Retirer l’épingle si c’était ce message
    await db.chatConversation.updateMany({
      where: { id: msg.conversationId, pinnedMessageId: messageId },
      data: { pinnedMessageId: null, pinnedAt: null, pinnedById: null },
    })

    return res.json({ data: serializeMessage(updated, me) })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** Masquer pour moi uniquement. */
router.post('/messages/:messageId/hide', authenticate(), async (req: AuthRequest, res) => {
  try {
    const me = req.user!.sub
    const messageId = Number(req.params.messageId)
    if (!Number.isInteger(messageId)) return res.status(400).json({ error: 'id invalide' })

    const msg = await db.chatMessage.findUnique({ where: { id: messageId } })
    if (!msg) return res.status(404).json({ error: 'Message introuvable' })
    if (!(await assertParticipant(msg.conversationId, me))) {
      return res.status(403).json({ error: 'Accès refusé' })
    }

    await db.chatMessageHide.upsert({
      where: { messageId_userId: { messageId, userId: me } },
      create: { messageId, userId: me },
      update: { hiddenAt: new Date() },
    })

    return res.json({ ok: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** Épingler un message. */
router.post('/conversations/:id/pin', authenticate(), async (req: AuthRequest, res) => {
  try {
    const me = req.user!.sub
    const id = Number(req.params.id)
    const messageId = Number(req.body?.messageId)
    if (!Number.isInteger(id) || !Number.isInteger(messageId)) {
      return res.status(400).json({ error: 'Paramètres invalides' })
    }
    if (!(await assertParticipant(id, me))) {
      return res.status(403).json({ error: 'Accès refusé' })
    }

    const msg = await db.chatMessage.findFirst({
      where: { id: messageId, conversationId: id, deletedAt: null },
      include: {
        sender: { select: { id: true, fullName: true, email: true } },
        attachments: true,
      },
    })
    if (!msg) return res.status(404).json({ error: 'Message introuvable' })

    await db.chatConversation.update({
      where: { id },
      data: {
        pinnedMessageId: messageId,
        pinnedAt: new Date(),
        pinnedById: me,
      },
    })

    return res.json({ data: serializeMessage(msg, me) })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** Retirer l’épingle. */
router.delete('/conversations/:id/pin', authenticate(), async (req: AuthRequest, res) => {
  try {
    const me = req.user!.sub
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'id invalide' })
    if (!(await assertParticipant(id, me))) {
      return res.status(403).json({ error: 'Accès refusé' })
    }
    await db.chatConversation.update({
      where: { id },
      data: { pinnedMessageId: null, pinnedAt: null, pinnedById: null },
    })
    return res.json({ ok: true })
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
