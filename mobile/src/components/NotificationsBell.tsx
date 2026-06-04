import { useCallback, useEffect, useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '../lib/notifications'

type Props = {
  accessToken: string
  userId: number
  iconColor?: string
  onOpenVehicule?: (vehiculeId: number) => void
}

export default function NotificationsBell({
  accessToken,
  userId,
  iconColor = '#f9fafb',
  onOpenVehicule,
}: Props) {
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const rows = await fetchNotifications(accessToken)
      setList(rows.sort((a, b) => b.date.localeCompare(a.date)))
    } catch {
      setList([])
    }
  }, [accessToken])

  useEffect(() => {
    void refresh()
    const id = setInterval(() => void refresh(), 60_000)
    return () => clearInterval(id)
  }, [refresh])

  useEffect(() => {
    if (open) {
      setLoading(true)
      void refresh().finally(() => setLoading(false))
    }
  }, [open, refresh])

  const unread = list.filter((n) => !n.read).length

  const handlePress = async (n: AppNotification) => {
    if (!n.read) {
      try {
        await markNotificationRead(accessToken, n.id)
        setList((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
      } catch {
        /* ignore */
      }
    }
    setOpen(false)
    if (n.vehiculeId != null && onOpenVehicule) {
      onOpenVehicule(n.vehiculeId)
    }
  }

  const markAll = async () => {
    try {
      await markAllNotificationsRead(accessToken)
      setList((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <Pressable
        style={[styles.bellBtn, open && styles.bellBtnActive]}
        onPress={() => setOpen(true)}
        hitSlop={8}
      >
        <Ionicons name="notifications-outline" size={24} color={iconColor} />
        {unread > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Notifications</Text>
              {unread > 0 ? (
                <Pressable onPress={() => void markAll()}>
                  <Text style={styles.markAll}>Tout marquer lu</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </Pressable>
            </View>
            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {loading && list.length === 0 ? (
                <Text style={styles.empty}>Chargement…</Text>
              ) : list.length === 0 ? (
                <Text style={styles.empty}>Aucune notification</Text>
              ) : (
                list.slice(0, 30).map((n) => (
                  <Pressable
                    key={n.id}
                    style={[styles.item, !n.read && styles.itemUnread]}
                    onPress={() => void handlePress(n)}
                  >
                    {n.title ? (
                      <Text style={styles.itemTitle}>{n.title}</Text>
                    ) : null}
                    <Text style={styles.itemMessage}>{n.message}</Text>
                    <Text style={styles.itemDate}>
                      {new Date(n.date).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                    {n.vehiculeId != null ? (
                      <Text style={styles.itemLink}>Voir le véhicule →</Text>
                    ) : null}
                  </Pressable>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  bellBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBtnActive: { opacity: 0.85 },
  badge: {
    position: 'absolute',
    top: 6,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-start',
    paddingTop: 56,
    paddingHorizontal: 12,
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 16,
    maxHeight: '75%',
    borderWidth: 2,
    borderColor: '#fed7aa',
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: '#fff7ed',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  panelTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: '#111827' },
  markAll: { fontSize: 12, color: '#ea580c', fontWeight: '600' },
  list: { maxHeight: 400 },
  empty: { padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 14 },
  item: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  itemUnread: { backgroundColor: '#fff7ed' },
  itemTitle: { fontSize: 12, fontWeight: '700', color: '#ea580c', marginBottom: 2 },
  itemMessage: { fontSize: 14, color: '#111827' },
  itemDate: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  itemLink: { fontSize: 12, color: '#2563eb', marginTop: 6, fontWeight: '600' },
})
