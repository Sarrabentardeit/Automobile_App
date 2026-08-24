import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { createAndPush } from '../lib/notify'
import { authenticate, type AuthRequest } from '../middleware/auth'

const router = Router()

function mapNotif(n: {
  id: number
  userId: number
  type: string
  reclamationId: number | null
  vehiculeId: number | null
  conversationId?: number | null
  clientDetteId?: number | null
  notePersonnelleId?: number | null
  title: string | null
  message: string
  createdAt: Date
  read: boolean
}) {
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    reclamationId: n.reclamationId ?? undefined,
    vehiculeId: n.vehiculeId ?? undefined,
    conversationId: n.conversationId ?? undefined,
    clientDetteId: n.clientDetteId ?? undefined,
    notePersonnelleId: n.notePersonnelleId ?? undefined,
    title: n.title ?? undefined,
    message: n.message,
    date: n.createdAt.toISOString(),
    read: n.read,
  }
}

/** POST /notifications - créer une notification pour un utilisateur */
router.post('/', authenticate(), async (req: AuthRequest, res) => {
  try {
    const actorId = req.user?.sub
    if (!actorId) return res.status(401).json({ error: 'Non authentifié' })

    const body = req.body as {
      userId?: number
      message?: string
      type?: string
      reclamationId?: number
      vehiculeId?: number
      conversationId?: number
      clientDetteId?: number
      title?: string
    }
    if (!body.userId || !body.message?.trim()) {
      return res.status(400).json({ error: 'userId et message requis' })
    }

    const created = await createAndPush({
      userId: body.userId,
      message: body.message,
      type: body.type,
      title: body.title,
      reclamationId: body.reclamationId,
      vehiculeId: body.vehiculeId,
      conversationId: body.conversationId,
      clientDetteId: body.clientDetteId,
    })

    return res.status(201).json(created)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** Chat = bulle/son dédiés, pas la cloche Notifications. */
const notChatWhere = {
  type: { not: 'chat_message' },
  conversationId: null,
}

/** GET /notifications - liste des notifications de l'utilisateur connecté */
router.get('/', authenticate(), async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.sub
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const list = await prisma.notification.findMany({
      where: { userId, ...notChatWhere },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return res.json(list.map(mapNotif))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** GET /notifications/unread-count — total réel (pas limité à 100) */
router.get('/unread-count', authenticate(), async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.sub
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const count = await prisma.notification.count({
      where: { userId, read: false, ...notChatWhere },
    })

    return res.json({ count })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** PATCH /notifications/:id/read - marquer une notification comme lue */
router.patch('/:id/read', authenticate(), async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.sub
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })

    const notif = await prisma.notification.findFirst({
      where: { id, userId },
    })
    if (!notif) return res.status(404).json({ error: 'Notification introuvable' })

    await prisma.notification.update({
      where: { id },
      data: { read: true },
    })

    return res.json({ ok: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** PATCH /notifications/read-all - marquer toutes les notifications de l'utilisateur comme lues */
router.patch('/read-all', authenticate(), async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.sub
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    })

    return res.json({ ok: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
