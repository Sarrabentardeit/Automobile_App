import { apiFetch } from './api'

export type AppNotification = {
  id: number
  userId: number
  type?: string
  reclamationId?: number
  vehiculeId?: number
  title?: string
  message: string
  date: string
  read: boolean
}

export async function fetchNotifications(token: string): Promise<AppNotification[]> {
  const list = await apiFetch<AppNotification[]>('/notifications', { token })
  return Array.isArray(list) ? list : []
}

export async function markNotificationRead(token: string, id: number): Promise<void> {
  await apiFetch(`/notifications/${id}/read`, { method: 'PATCH', token })
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  await apiFetch('/notifications/read-all', { method: 'PATCH', token })
}
