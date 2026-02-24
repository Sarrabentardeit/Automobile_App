import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Notification } from '@/types'

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
}

const Context = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(loadNotifications)
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications)) }, [notifications])

  const myNotifications = useCallback(
    (userId: number) =>
      notifications
        .filter(n => n.userId === userId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [notifications]
  )

  const unreadCount = useCallback(
    (userId: number) => notifications.filter(n => n.userId === userId && !n.read).length,
    [notifications]
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

  const markAsRead = useCallback((id: number) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  const markAllAsRead = useCallback((userId: number) => {
    setNotifications(prev => prev.map(n => (n.userId === userId ? { ...n, read: true } : n)))
  }, [])

  return (
    <Context.Provider
      value={{
        notifications,
        myNotifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
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
