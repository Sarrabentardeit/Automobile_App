import { apiFetch } from './api'
import type { CaisseState, TeamMoneyDayEntry } from '../types/caisse'

export async function fetchCaisse(token: string): Promise<CaisseState> {
  const res = await apiFetch<CaisseState>('/caisse', { token })
  return { data: Array.isArray(res.data) ? res.data : [], updatedAt: res.updatedAt ?? null }
}

export async function saveCaisse(
  token: string,
  days: TeamMoneyDayEntry[],
  expectedUpdatedAt: string | null
): Promise<CaisseState> {
  return apiFetch<CaisseState>('/caisse', {
    method: 'PUT',
    token,
    body: { days, expectedUpdatedAt },
  })
}

export function teamMoneyMemberKey(userId: number): string {
  return `u:${userId}`
}

export function parseTeamMoneyMemberKey(key: string): number | null {
  if (!key.startsWith('u:')) return null
  const id = Number(key.slice(2))
  return Number.isFinite(id) && id > 0 ? id : null
}

export function getSlotForUser(
  members: Record<string, { inHand: number | null; taken: number | null; note: string; presence: string | null }>,
  userId: number
): { inHand: number | null; taken: number | null; note: string; presence: string | null } {
  const key = teamMoneyMemberKey(userId)
  const slot = members[key]
  return slot ?? { inHand: null, taken: null, note: '', presence: null }
}
