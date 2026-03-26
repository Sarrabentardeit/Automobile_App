import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Notification } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch } from '@/lib/api'

interface NotificationsContextValue {
  notifications: Notification[]
  myNotifications: (userId: number) => Notification[]
  unreadCount: (userId: number) => number
  addNotification: (userId: number, message: string) => void
  markAsRead: (id: number) => void
  markAllAsRead: (userId: number) => void
  refreshApiNotifications: () => Promise<void>
}

const Context = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user, getAccessToken } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])

  const fetchApiNotifications = useCallback(async () => {
    const token = getAccessToken()
    if (!token || !user?.id) {
      setNotifications([])
      return
    }
    try {
      const list = await apiFetch<Array<{ id: number; userId: number; type?: string; reclamationId?: number; title?: string; message: string; date: string; read: boolean }>>(
        '/notifications',
        { token }
      )
      setNotifications(list ?? [])
    } catch {
      setNotifications([])
    }
  }, [user?.id, getAccessToken])

  useEffect(() => {
    fetchApiNotifications()
  }, [fetchApiNotifications])

  const myNotifications = useCallback(
    (userId: number) => {
      const api = user?.id === userId ? notifications : []
      return [...api].sort((a, b) => b.date.localeCompare(a.date))
    },
    [notifications, user?.id]
  )

  const unreadCount = useCallback(
    (userId: number) => {
      const list = myNotifications(userId)
      return list.filter(n => !n.read).length
    },
    [myNotifications]
  )

  const addNotification = useCallback((userId: number, message: string) => {
    const token = getAccessToken()
    if (!token) return
    void (async () => {
      try {
        const created = await apiFetch<Notification>('/notifications', {
          method: 'POST',
          token,
          body: JSON.stringify({ userId, message }),
        })
        if (user?.id === userId) {
          setNotifications(prev => [created, ...prev])
        }
      } catch {
        // ignore notification creation failures
      }
    })()
  }, [getAccessToken, user?.id])

  const markAsRead = useCallback(
    async (id: number) => {
      const token = getAccessToken()
      if (token) {
        try {
          await apiFetch(`/notifications/${id}/read`, { method: 'PATCH', token })
          setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
        } catch {
          // ignore
        }
      }
    },
    [getAccessToken]
  )

  const markAllAsRead = useCallback(
    async (userId: number) => {
      if (user?.id === userId) {
        const token = getAccessToken()
        if (token) {
          try {
            await apiFetch('/notifications/read-all', { method: 'PATCH', token })
            setNotifications(prev => prev.map(n => ({ ...n, read: true })))
          } catch {
            // ignore
          }
        }
      }
    },
    [user?.id, getAccessToken]
  )

  return (
    <Context.Provider
      value={{
        notifications,
        myNotifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        refreshApiNotifications: fetchApiNotifications,
      }}
    >
      {children}
    </Context.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}
