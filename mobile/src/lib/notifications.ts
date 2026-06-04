import { apiFetch } from './api'
import type { AppUser } from './vehiculeApi'

export type { AppNotification } from './notificationsApi'
export {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './notificationsApi'

export async function createNotification(
  token: string,
  data: {
    userId: number
    message: string
    type?: string
    vehiculeId?: number
    title?: string
  }
): Promise<void> {
  await apiFetch('/notifications', {
    method: 'POST',
    token,
    body: data,
  })
}

export async function notifyAssignedUsers(
  token: string,
  users: AppUser[],
  techIds: number[],
  respIds: number[],
  message: string,
  vehiculeId?: number
): Promise<void> {
  const ids = Array.from(new Set([...techIds, ...respIds]))
  await Promise.all(
    ids.map(async (userId) => {
      const exists = users.some((u) => u.id === userId)
      if (!exists) return
      try {
        await createNotification(token, {
          userId,
          message,
          type: 'vehicule_assigned',
          vehiculeId,
          title: 'Véhicule',
        })
      } catch {
        /* ignore single failure */
      }
    })
  )
}
