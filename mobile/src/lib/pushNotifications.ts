import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { apiFetch } from './api'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export type PushNavPayload = {
  vehiculeId?: number | null
  conversationId?: number | null
  clientDetteId?: number | null
  notePersonnelleId?: number | null
  reclamationId?: number | null
  type?: string | null
}

export async function registerExpoPushToken(accessToken: string): Promise<string | null> {
  if (!Device.isDevice) return null

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') return null

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'EL MECANO',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 180, 80, 180],
    })
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 120, 60, 120],
    })
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Rappels notes',
      description: 'Rappels de Mes notes',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 120, 250, 120, 250],
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    })
  }

  const projectId =
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId

  const tokenRes = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  )
  const token = tokenRes.data
  if (!token) return null

  await apiFetch('/users/me/push-token', {
    method: 'POST',
    token: accessToken,
    body: { token },
  })
  return token
}

/** Évite de rejouer le même tap notif à chaque remount MainApp */
let lastHandledNotificationId: string | null = null

export function claimNotificationResponseId(id: string): boolean {
  if (lastHandledNotificationId === id) return false
  lastHandledNotificationId = id
  return true
}

export function parsePushData(data: Record<string, unknown> | undefined): PushNavPayload {
  if (!data) return {}
  const num = (v: unknown) => {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  return {
    vehiculeId: num(data.vehiculeId),
    conversationId: num(data.conversationId),
    clientDetteId: num(data.clientDetteId),
    notePersonnelleId: num(data.notePersonnelleId),
    reclamationId: num(data.reclamationId),
    type: typeof data.type === 'string' ? data.type : null,
  }
}

/** Aligné avec NotificationsBell.resolveNotificationTarget */
export function pushPayloadToNavTarget(
  data: Record<string, unknown> | undefined
):
  | { kind: 'vehicule'; vehiculeId: number }
  | { kind: 'chat'; conversationId?: number }
  | { kind: 'dette'; detteId: number }
  | { kind: 'note'; noteId?: number }
  | { kind: 'route'; route: 'reclamation' | 'calendar' | 'clients_dettes' | 'devis' | 'chat' | 'notes' }
  | null {
  const p = parsePushData(data)
  if (p.conversationId != null) return { kind: 'chat', conversationId: p.conversationId }
  if (p.clientDetteId != null) return { kind: 'dette', detteId: p.clientDetteId }
  if (p.notePersonnelleId != null) return { kind: 'note', noteId: p.notePersonnelleId }
  if (p.vehiculeId != null) return { kind: 'vehicule', vehiculeId: p.vehiculeId }
  if (p.reclamationId != null) return { kind: 'route', route: 'reclamation' }
  const t = (p.type ?? '').toLowerCase()
  if (t.includes('note') || t.includes('rappel')) return { kind: 'note' }
  if (t.includes('chat') || t.includes('message')) return { kind: 'chat' }
  if (t.includes('dette') || t.includes('debt')) return { kind: 'route', route: 'clients_dettes' }
  if (t.includes('calendar') || t.includes('rdv') || t.includes('affectation')) {
    return { kind: 'route', route: 'calendar' }
  }
  if (t.includes('devis')) return { kind: 'route', route: 'devis' }
  return null
}
