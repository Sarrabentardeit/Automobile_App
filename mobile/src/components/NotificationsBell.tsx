import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { fetchChatConversations } from '../lib/chatApi'
import {
  fetchNotifications,
  fetchNotificationsUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '../lib/notifications'
import { playMessageSound, playNotificationSound } from '../lib/appSounds'
import { isRealtimeConnected } from '../lib/realtimeClient'
import type { MenuRouteId } from '../navigation/menuConfig'

export type NotificationNavigateTarget =
  | { kind: 'vehicule'; vehiculeId: number }
  | { kind: 'chat'; conversationId?: number }
  | { kind: 'dette'; detteId: number }
  | { kind: 'note'; noteId?: number }
  | { kind: 'route'; route: MenuRouteId }

type Props = {
  accessToken: string
  iconColor?: string
  onNavigate?: (target: NotificationNavigateTarget) => void
}

export function resolveNotificationTarget(
  n: Pick<
    AppNotification,
    'vehiculeId' | 'reclamationId' | 'conversationId' | 'clientDetteId' | 'notePersonnelleId' | 'type'
  >
): NotificationNavigateTarget | null {
  if (n.conversationId != null) return { kind: 'chat', conversationId: n.conversationId }
  if (n.clientDetteId != null) return { kind: 'dette', detteId: n.clientDetteId }
  if (n.notePersonnelleId != null) return { kind: 'note', noteId: n.notePersonnelleId }
  if (n.vehiculeId != null) return { kind: 'vehicule', vehiculeId: n.vehiculeId }
  if (n.reclamationId != null) return { kind: 'route', route: 'reclamation' }
  const t = (n.type ?? '').toLowerCase()
  if (t.includes('note') || t.includes('rappel')) return { kind: 'note' }
  if (t.includes('chat') || t.includes('message')) return { kind: 'chat' }
  if (t.includes('dette') || t.includes('debt')) return { kind: 'route', route: 'clients_dettes' }
  if (t.includes('calendar') || t.includes('rdv') || t.includes('affectation')) {
    return { kind: 'route', route: 'calendar' }
  }
  if (t.includes('devis')) return { kind: 'route', route: 'devis' }
  return null
}

function formatNotifDisplay(n: AppNotification): { label: string | null; message: string } {
  const isNote =
    n.notePersonnelleId != null || (n.type ?? '').includes('note') || (n.type ?? '').includes('rappel')
  if (isNote) {
    const fromTitle = (n.title ?? '').replace(/^📝\s*/, '').trim()
    const body = (n.message ?? '').replace(/^📝\s*/, '').trim()
    const noteName =
      fromTitle && fromTitle !== 'Note' && fromTitle !== 'Rappel' ? fromTitle : null
    const message =
      noteName && body && !body.toLowerCase().startsWith('rappel')
        ? `Rappel : ${noteName} — ${body}`
        : body || (noteName ? `Rappel : ${noteName}` : 'Rappel sur une note')
    return { label: 'Note', message }
  }
  const label = n.title?.trim() || (n.vehiculeId != null ? 'Véhicule' : null)
  return { label, message: n.message }
}

function linkLabel(n: AppNotification): string | null {
  const target = resolveNotificationTarget(n)
  if (!target) return null
  if (target.kind === 'vehicule') return 'Voir le véhicule →'
  if (target.kind === 'chat') return 'Ouvrir la conversation →'
  if (target.kind === 'dette') return 'Voir la dette →'
  if (target.kind === 'note') return 'Ouvrir la note →'
  switch (target.route) {
    case 'reclamation':
      return 'Voir les réclamations →'
    case 'calendar':
      return 'Voir le calendrier →'
    case 'clients_dettes':
      return 'Voir les dettes →'
    case 'devis':
      return 'Voir les devis →'
    default:
      return 'Ouvrir →'
  }
}

export default function NotificationsBell({
  accessToken,
  iconColor = '#f9fafb',
  onNavigate,
}: Props) {
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<AppNotification[]>([])
  const [unreadNotif, setUnreadNotif] = useState(0)
  const [chatUnread, setChatUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const readyRef = useRef(false)
  const chatUnreadRef = useRef(0)
  const notifIdsRef = useRef<Set<number>>(new Set())

  const refreshBadge = useCallback(async () => {
    try {
      const [count, convos, rows] = await Promise.all([
        fetchNotificationsUnreadCount(accessToken),
        fetchChatConversations(accessToken).catch(() => []),
        fetchNotifications(accessToken).catch(() => [] as AppNotification[]),
      ])
      const nextChat = convos.reduce((s, c) => s + (c.unreadCount || 0), 0)
      const unreadRows = rows.filter((n) => {
        if (n.read) return false
        const t = (n.type ?? '').toLowerCase()
        return t !== 'chat_message' && !t.includes('chat_message')
      })
      const ids = new Set(unreadRows.map((n) => n.id))

      if (readyRef.current && !isRealtimeConnected()) {
        if (nextChat > chatUnreadRef.current) playMessageSound()
        for (const id of ids) {
          if (!notifIdsRef.current.has(id)) {
            playNotificationSound()
            break
          }
        }
      }

      chatUnreadRef.current = nextChat
      notifIdsRef.current = ids
      readyRef.current = true
      setUnreadNotif(count)
      setChatUnread(nextChat)
    } catch {
      /* keep previous */
    }
  }, [accessToken])

  const refreshList = useCallback(async () => {
    try {
      const rows = await fetchNotifications(accessToken)
      const nonChat = rows.filter((n) => {
        if (n.conversationId != null) return false
        const t = (n.type ?? '').toLowerCase()
        return t !== 'chat_message' && !t.includes('chat_message')
      })
      setList(nonChat.sort((a, b) => b.date.localeCompare(a.date)))
    } catch {
      setList([])
    }
  }, [accessToken])

  useEffect(() => {
    readyRef.current = false
    chatUnreadRef.current = 0
    notifIdsRef.current = new Set()
    void refreshBadge()
    const id = setInterval(() => void refreshBadge(), 12_000)
    return () => clearInterval(id)
  }, [refreshBadge])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    void Promise.all([refreshList(), refreshBadge()]).finally(() => setLoading(false))
  }, [open, refreshList, refreshBadge])

  const badgeTotal = unreadNotif + chatUnread

  const handlePress = async (n: AppNotification) => {
    if (!n.read) {
      try {
        await markNotificationRead(accessToken, n.id)
        setList((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
        setUnreadNotif((c) => Math.max(0, c - 1))
      } catch {
        /* ignore */
      }
    }
    setOpen(false)
    const target = resolveNotificationTarget(n)
    if (target) onNavigate?.(target)
  }

  const markAll = async () => {
    try {
      await markAllNotificationsRead(accessToken)
      setList((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadNotif(0)
    } catch {
      /* ignore */
    }
  }

  const openChat = () => {
    setOpen(false)
    onNavigate?.({ kind: 'chat' })
  }

  return (
    <>
      <Pressable
        style={[styles.bellBtn, open && styles.bellBtnActive]}
        onPress={() => setOpen(true)}
        hitSlop={8}
        accessibilityLabel={
          badgeTotal > 0 ? `Notifications, ${badgeTotal} non lues` : 'Notifications'
        }
      >
        <Ionicons name="notifications-outline" size={24} color={iconColor} />
        {badgeTotal > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeTotal > 99 ? '99+' : badgeTotal}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Notifications</Text>
              {unreadNotif > 0 ? (
                <Pressable onPress={() => void markAll()}>
                  <Text style={styles.markAll}>Tout marquer lu</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </Pressable>
            </View>

            {chatUnread > 0 ? (
              <Pressable style={styles.chatRow} onPress={openChat}>
                <Ionicons name="chatbubbles-outline" size={18} color="#2563eb" />
                <Text style={styles.chatRowText}>
                  Chat — {chatUnread} message{chatUnread > 1 ? 's' : ''} non lu
                  {chatUnread > 1 ? 's' : ''}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#2563eb" />
              </Pressable>
            ) : null}

            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              {loading && list.length === 0 ? (
                <Text style={styles.empty}>Chargement…</Text>
              ) : list.length === 0 ? (
                <Text style={styles.empty}>Aucune notification</Text>
              ) : (
                list.slice(0, 40).map((n) => {
                  const link = linkLabel(n)
                  return (
                    <Pressable
                      key={n.id}
                      style={[styles.item, !n.read && styles.itemUnread]}
                      onPress={() => void handlePress(n)}
                    >
                      {(() => {
                        const { label, message } = formatNotifDisplay(n)
                        return (
                          <>
                            {label ? <Text style={styles.itemTitle}>{label}</Text> : null}
                            <Text style={styles.itemMessage}>{message}</Text>
                          </>
                        )
                      })()}
                      <Text style={styles.itemDate}>
                        {new Date(n.date).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      {link ? <Text style={styles.itemLink}>{link}</Text> : null}
                    </Pressable>
                  )
                })
              )}
            </ScrollView>
          </View>
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
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#eff6ff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
  },
  chatRowText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#1d4ed8' },
  list: { maxHeight: 400 },
  empty: { padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 14 },
  item: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  itemUnread: { backgroundColor: '#fff7ed' },
  itemTitle: { fontSize: 12, fontWeight: '700', color: '#ea580c', marginBottom: 2 },
  itemMessage: { fontSize: 14, color: '#111827' },
  itemDate: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  itemLink: { fontSize: 12, color: '#2563eb', marginTop: 6, fontWeight: '600' },
})
