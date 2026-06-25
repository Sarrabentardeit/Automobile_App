import { apiFetch } from './api'
import type { OutilAhmed, OutilAhmedInput } from '../types/outilAhmed'

export async function fetchOutilsAhmed(token: string): Promise<OutilAhmed[]> {
  const list = await apiFetch<OutilAhmed[]>('/outils/ahmed', { token })
  return Array.isArray(list) ? list : []
}

export async function createOutilAhmed(
  token: string,
  data: OutilAhmedInput
): Promise<OutilAhmed> {
  return apiFetch<OutilAhmed>('/outils/ahmed', {
    method: 'POST',
    token,
    body: data,
  })
}

export async function updateOutilAhmed(
  token: string,
  id: number,
  data: Partial<OutilAhmedInput>
): Promise<OutilAhmed> {
  return apiFetch<OutilAhmed>(`/outils/ahmed/${id}`, {
    method: 'PUT',
    token,
    body: data,
  })
}

export async function deleteOutilAhmed(token: string, id: number): Promise<void> {
  await apiFetch<void>(`/outils/ahmed/${id}`, { method: 'DELETE', token })
}
