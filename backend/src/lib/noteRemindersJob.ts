import { prisma } from './prisma'
import { createAndPush } from './notify'

const db = prisma as any

let timer: ReturnType<typeof setInterval> | null = null
let running = false

/**
 * Envoie cloche + push pour les notes dont le rappel est dû.
 * Pas de message chat.
 */
export async function processDueNoteReminders(): Promise<number> {
  if (running) return 0
  running = true
  let sent = 0
  try {
    const now = new Date()
    const due = (await db.notePersonnelle.findMany({
      where: {
        faite: false,
        rappelAt: { lte: now },
      },
      take: 100,
    })) as Array<{
      id: number
      userId: number
      titre: string
      contenu: string
      rappelAt: Date | null
      rappelNotifieAt: Date | null
    }>

    const pending = due.filter((n) => {
      if (!n.rappelAt) return false
      if (!n.rappelNotifieAt) return true
      return n.rappelNotifieAt.getTime() < n.rappelAt.getTime()
    })

    for (const note of pending) {
      if (!note.rappelAt) continue
      const noteTitle = note.titre?.trim() || 'Sans titre'
      const preview = note.contenu?.trim().slice(0, 120)
      const message = preview
        ? `Rappel : ${noteTitle} — ${preview}`
        : `Rappel : ${noteTitle}`

      try {
        await createAndPush({
          userId: note.userId,
          type: 'note_rappel',
          title: 'Note',
          message,
          notePersonnelleId: note.id,
        })
        await db.notePersonnelle.update({
          where: { id: note.id },
          data: { rappelNotifieAt: note.rappelAt },
        })
        sent += 1
      } catch (err) {
        console.warn('[note-reminders] failed for note', note.id, err)
      }
    }
  } catch (err) {
    console.warn('[note-reminders] tick failed', err)
  } finally {
    running = false
  }
  return sent
}

export function startNoteRemindersJob(intervalMs = 60_000): void {
  if (timer) return
  void processDueNoteReminders()
  timer = setInterval(() => {
    void processDueNoteReminders()
  }, intervalMs)
  console.log('[note-reminders] job started (every', intervalMs / 1000, 's)')
}
