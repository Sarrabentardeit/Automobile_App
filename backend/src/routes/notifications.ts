import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'

const router = Router()

/** GET /notifications - liste des notifications de l'utilisateur connecté */
router.get('/', authenticate(), async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.sub
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const list = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const mapped = list.map((n) => ({
      id: n.id,
      userId: n.userId,
      type: n.type,
      reclamationId: n.reclamationId ?? undefined,
      title: n.title ?? undefined,
      message: n.message,
      date: n.createdAt.toISOString(),
      read: n.read,
    }))

    return res.json(mapped)
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
