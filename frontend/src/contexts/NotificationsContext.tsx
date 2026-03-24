import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Notification } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch } from '@/lib/api'

const STORAGE_KEY = 'elmecano-notifications'

function loadNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

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
  const [notifications, setNotifications] = useState<Notification[]>(loadNotifications)
  const [apiNotifications, setApiNotifications] = useState<Notification[]>([])

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications)) }, [notifications])

  const fetchApiNotifications = useCallback(async () => {
    const token = getAccessToken()
    if (!token || !user?.id) {
      setApiNotifications([])
      return
    }
    try {
      const list = await apiFetch<Array<{ id: number; userId: number; type?: string; reclamationId?: number; title?: string; message: string; date: string; read: boolean }>>(
        '/notifications',
        { token }
      )
      setApiNotifications(list ?? [])
    } catch {
      setApiNotifications([])
    }
  }, [user?.id, getAccessToken])

  useEffect(() => {
    fetchApiNotifications()
  }, [fetchApiNotifications])

  const myNotifications = useCallback(
    (userId: number) => {
      const local = notifications.filter(n => n.userId === userId)
      const api = user?.id === userId ? apiNotifications : []
      return [...local, ...api].sort((a, b) => b.date.localeCompare(a.date))
    },
    [notifications, apiNotifications, user?.id]
  )

  const unreadCount = useCallback(
    (userId: number) => {
      const list = myNotifications(userId)
      return list.filter(n => !n.read).length
    },
    [myNotifications]
  )

  const addNotification = useCallback((userId: number, message: string) => {
    setNotifications(prev => [
      ...prev,
      {
        id: Math.max(0, ...prev.map(n => n.id)) + 1,
        userId,
        message,
        date: new Date().toISOString(),
        read: false,
      },
    ])
  }, [])

  const markAsRead = useCallback(
    async (id: number) => {
      const fromApi = apiNotifications.some(n => n.id === id)
      if (fromApi) {
        const token = getAccessToken()
        if (token) {
          try {
            await apiFetch(`/notifications/${id}/read`, { method: 'PATCH', token })
            setApiNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
          } catch {
            // ignore
          }
        }
      } else {
        setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
      }
    },
    [apiNotifications, getAccessToken]
  )

  const markAllAsRead = useCallback(
    async (userId: number) => {
      if (user?.id === userId) {
        const token = getAccessToken()
        if (token) {
          try {
            await apiFetch('/notifications/read-all', { method: 'PATCH', token })
            setApiNotifications(prev => prev.map(n => ({ ...n, read: true })))
          } catch {
            // ignore
          }
        }
      }
      setNotifications(prev => prev.map(n => (n.userId === userId ? { ...n, read: true } : n)))
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
