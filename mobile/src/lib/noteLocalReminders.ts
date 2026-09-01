import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import type { NotePersonnelle } from '../types/notePersonnelle'

export const NOTE_REMINDER_CHANNEL = 'reminders'

function reminderId(noteId: number): string {
  return `note-rappel-${noteId}`
}

/** Canal Android dédié rappels (son + priorité max). */
export async function ensureReminderNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync(NOTE_REMINDER_CHANNEL, {
    name: 'Rappels notes',
    description: 'Rappels de Mes notes à l’heure exacte',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 250, 120, 250, 120, 250],
    enableVibrate: true,
    bypassDnd: false,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  })
}

export async function cancelNoteLocalReminder(noteId: number): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(reminderId(noteId))
  } catch {
    /* ignore */
  }
}

/**
 * Planifie une notif locale sur le téléphone à l’heure du rappel.
 * Plus fiable que le push serveur seul (fonctionne même sans réseau au moment M).
 */
export async function scheduleNoteLocalReminder(note: {
  id: number
  titre?: string
  contenu?: string
  rappelAt?: string | null
  faite?: boolean
}): Promise<void> {
  await cancelNoteLocalReminder(note.id)

  if (note.faite) return
  if (!note.rappelAt) return

  const when = new Date(note.rappelAt)
  if (Number.isNaN(when.getTime())) return
  // Déjà passé : pas de schedule (le serveur / cloche gère l’historique)
  if (when.getTime() <= Date.now() + 5_000) return

  const { status } = await Notifications.getPermissionsAsync()
  if (status !== 'granted') return

  await ensureReminderNotificationChannel()

  const title = 'Note'
  const noteTitle = (note.titre ?? '').trim() || 'Sans titre'
  const preview = (note.contenu ?? '').trim().slice(0, 120)
  const body = preview ? `Rappel : ${noteTitle} — ${preview}` : `Rappel : ${noteTitle}`

  await Notifications.scheduleNotificationAsync({
    identifier: reminderId(note.id),
    content: {
      title,
      body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
      data: {
        type: 'note_rappel',
        notePersonnelleId: note.id,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
      channelId: NOTE_REMINDER_CHANNEL,
    },
  })
}

/** Resynchronise tous les rappels locaux depuis la liste serveur. */
export async function syncNoteLocalReminders(notes: NotePersonnelle[]): Promise<void> {
  await ensureReminderNotificationChannel()
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  const ours = scheduled.filter(n => n.identifier.startsWith('note-rappel-'))
  for (const n of ours) {
    await Notifications.cancelScheduledNotificationAsync(n.identifier)
  }
  await Promise.all(
    notes.map(note =>
      scheduleNoteLocalReminder(note).catch(() => undefined)
    )
  )
}
