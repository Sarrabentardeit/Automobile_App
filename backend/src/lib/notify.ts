import { prisma } from './prisma'

const db = prisma as any

export type NotifyInput = {
  userId: number
  message: string
  type?: string
  title?: string
  vehiculeId?: number | null
  reclamationId?: number | null
  conversationId?: number | null
  clientDetteId?: number | null
}

type CreatedNotif = {
  id: number
  userId: number
  type: string
  reclamationId?: number
  vehiculeId?: number
  conversationId?: number
  clientDetteId?: number
  title?: string
  message: string
  date: string
  read: boolean
}

async function sendExpoPush(
  token: string,
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<void> {
  if (!token.startsWith('ExponentPushToken') && !token.startsWith('ExpoPushToken')) return
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        sound: 'default',
        title,
        body,
        data,
      }),
    })
  } catch (err) {
    console.warn('[notify] push failed', err)
  }
}

/** Crée une notif in-app + push Expo si token enregistré. */
export async function createAndPush(input: NotifyInput): Promise<CreatedNotif> {
  const created = await db.notification.create({
    data: {
      userId: input.userId,
      message: input.message.trim(),
      type: input.type?.trim() || 'manual',
      title: input.title?.trim() || null,
      reclamationId: input.reclamationId ?? null,
      vehiculeId: input.vehiculeId ?? null,
      conversationId: input.conversationId ?? null,
      clientDetteId: input.clientDetteId ?? null,
      read: false,
    },
  })

  const dto: CreatedNotif = {
    id: created.id,
    userId: created.userId,
    type: created.type,
    reclamationId: created.reclamationId ?? undefined,
    vehiculeId: created.vehiculeId ?? undefined,
    conversationId: created.conversationId ?? undefined,
    clientDetteId: created.clientDetteId ?? undefined,
    title: created.title ?? undefined,
    message: created.message,
    date: created.createdAt.toISOString(),
    read: created.read,
  }

  try {
    const user = await db.user.findUnique({
      where: { id: input.userId },
      select: { expoPushToken: true },
    })
    const token = typeof user?.expoPushToken === 'string' ? user.expoPushToken.trim() : ''
    if (token) {
      void sendExpoPush(token, dto.title || 'EL MECANO', dto.message, {
        notificationId: dto.id,
        type: dto.type,
        vehiculeId: dto.vehiculeId ?? null,
        reclamationId: dto.reclamationId ?? null,
        conversationId: dto.conversationId ?? null,
        clientDetteId: dto.clientDetteId ?? null,
      })
    }
  } catch {
    /* push best-effort */
  }

  return dto
}

/** Notifie plusieurs users (dedupe). */
export async function notifyMany(
  userIds: number[],
  payload: Omit<NotifyInput, 'userId'>
): Promise<void> {
  const unique = Array.from(new Set(userIds.filter((id) => Number.isInteger(id) && id > 0)))
  await Promise.all(
    unique.map((userId) =>
      createAndPush({ ...payload, userId }).catch((err) => {
        console.warn('[notify] create failed for', userId, err)
      })
    )
  )
}
