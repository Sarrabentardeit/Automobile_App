import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuree(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return '-'
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h < 24) return m > 0 ? `${h}h${m}min` : `${h}h`
  const j = Math.floor(h / 24)
  const rh = h % 24
  return rh > 0 ? `${j}j ${rh}h` : `${j}j`
}

/** Parse une date YYYY-MM-DD (ou ISO avec T) sans décalage fuseau (évite jour précédent/suivant) */
export function parseDateOnly(dateStr: string): Date {
  const datePart = dateStr.split('T')[0]
  const [y, m, d] = datePart.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function formatDate(dateStr: string): string {
  return parseDateOnly(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export function formatDateTime(dateStr: string): string {
  const d = dateStr.includes('T') ? new Date(dateStr) : parseDateOnly(dateStr)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - parseDateOnly(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

export function getUserDisplayName(userId: number | null, users: { id: number; nom_complet: string }[]): string {
  if (!userId) return '-'
  return users.find(u => u.id === userId)?.nom_complet ?? '-'
}

/** Trouve l'id utilisateur par nom (ex. membre équipe → utilisateur) */
export function findUserIdByName(users: { id: number; nom_complet: string }[], memberName: string): number | null {
  const q = memberName.trim().toLowerCase()
  if (!q) return null
  const exact = users.find(u => u.nom_complet.toLowerCase() === q)
  if (exact) return exact.id
  const partial = users.find(u => u.nom_complet.toLowerCase().includes(q) || q.includes(u.nom_complet.toLowerCase()))
  return partial?.id ?? null
}
