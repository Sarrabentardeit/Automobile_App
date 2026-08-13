import * as FileSystem from 'expo-file-system/legacy'
import { changeEtat, uploadVehiculeImage } from './vehiculeApi'
import type { EtatVehicule, VehiculeImageUploadInput } from '../types/vehicule'

const QUEUE_PATH = `${FileSystem.documentDirectory}offline-queue.json`

export type OfflineQueueItem =
  | {
      id: string
      kind: 'change_etat'
      createdAt: string
      vehiculeId: number
      nouvel_etat: EtatVehicule
      commentaire?: string
      pieces_utilisees?: string
    }
  | {
      id: string
      kind: 'upload_image'
      createdAt: string
      vehiculeId: number
      payload: VehiculeImageUploadInput
    }

export function isNetworkError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message.toLowerCase() : String(e).toLowerCase()
  return (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('timeout') ||
    msg.includes('failed to fetch') ||
    msg.includes('connexion') ||
    msg.includes('internet') ||
    msg.includes('network request failed')
  )
}

async function readQueue(): Promise<OfflineQueueItem[]> {
  try {
    const info = await FileSystem.getInfoAsync(QUEUE_PATH)
    if (!info.exists) return []
    const raw = await FileSystem.readAsStringAsync(QUEUE_PATH)
    const parsed = JSON.parse(raw) as OfflineQueueItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeQueue(items: OfflineQueueItem[]): Promise<void> {
  await FileSystem.writeAsStringAsync(QUEUE_PATH, JSON.stringify(items))
}

export async function getOfflineQueueCount(): Promise<number> {
  return (await readQueue()).length
}

type EnqueueInput =
  | {
      kind: 'change_etat'
      vehiculeId: number
      nouvel_etat: EtatVehicule
      commentaire?: string
      pieces_utilisees?: string
    }
  | {
      kind: 'upload_image'
      vehiculeId: number
      payload: VehiculeImageUploadInput
    }

export async function enqueueOffline(item: EnqueueInput): Promise<OfflineQueueItem> {
  const full = {
    ...item,
    id: `${item.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  } as OfflineQueueItem
  const q = await readQueue()
  q.push(full)
  await writeQueue(q)
  return full
}

export async function flushOfflineQueue(token: string): Promise<{ done: number; left: number }> {
  const q = await readQueue()
  if (q.length === 0) return { done: 0, left: 0 }

  const remaining: OfflineQueueItem[] = []
  let done = 0

  for (let i = 0; i < q.length; i++) {
    const item = q[i]
    try {
      if (item.kind === 'change_etat') {
        await changeEtat(token, item.vehiculeId, {
          nouvel_etat: item.nouvel_etat,
          commentaire: item.commentaire,
          pieces_utilisees: item.pieces_utilisees,
        })
      } else {
        await uploadVehiculeImage(token, item.vehiculeId, item.payload)
      }
      done += 1
    } catch (e) {
      if (isNetworkError(e)) {
        remaining.push(...q.slice(i))
        break
      }
      done += 1
    }
  }

  await writeQueue(remaining)
  return { done, left: remaining.length }
}
