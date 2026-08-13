import { apiFetch } from './api'

export type AppNotification = {
  id: number
  userId: number
  type?: string
  reclamationId?: number
  vehiculeId?: number
  conversationId?: number
  clientDetteId?: number
  title?: string
  message: string
  date: string
  read: boolean
}

export async function fetchNotifications(token: string): Promise<AppNotification[]> {
  const list = await apiFetch<AppNotification[]>('/notifications', { token })
  return Array.isArray(list) ? list : []
}

export async function fetchNotificationsUnreadCount(token: string): Promise<number> {
  try {
    const res = await apiFetch<{ count: number }>('/notifications/unread-count', { token })
    return typeof res.count === 'number' ? res.count : 0
  } catch {
    return 0
  }
}

export async function markNotificationRead(token: string, id: number): Promise<void> {
  await apiFetch(`/notifications/${id}/read`, { method: 'PATCH', token })
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  await apiFetch('/notifications/read-all', { method: 'PATCH', token })
}
