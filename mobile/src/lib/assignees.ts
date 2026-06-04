import type { AppUser } from './vehiculeApi'

export function userNames(
  users: AppUser[],
  ids: number[] | undefined,
  fallbackId: number | null | undefined
): string {
  const list =
    ids && ids.length > 0
      ? ids
      : fallbackId != null
        ? [fallbackId]
        : []
  if (list.length === 0) return '—'
  const names = list
    .map((id) => users.find((u) => u.id === id)?.nom_complet ?? `ID ${id}`)
    .filter(Boolean)
  return names.length ? names.join(', ') : '—'
}
