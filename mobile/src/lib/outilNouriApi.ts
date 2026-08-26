import { apiFetch } from './api'
import type { OutilNouri, OutilNouriInput } from '../types/outilNouri'

export async function fetchOutilsNouri(token: string): Promise<OutilNouri[]> {
  const list = await apiFetch<OutilNouri[]>('/outils/nouri', { token })
  return Array.isArray(list) ? list : []
}

export async function createOutilNouri(
  token: string,
  data: OutilNouriInput
): Promise<OutilNouri> {
  return apiFetch<OutilNouri>('/outils/nouri', {
    method: 'POST',
    token,
    body: data,
  })
}

export async function updateOutilNouri(
  token: string,
  id: number,
  data: Partial<OutilNouriInput>
): Promise<OutilNouri> {
  return apiFetch<OutilNouri>(`/outils/nouri/${id}`, {
    method: 'PUT',
    token,
    body: data,
  })
}

export async function deleteOutilNouri(token: string, id: number): Promise<void> {
  await apiFetch<void>(`/outils/nouri/${id}`, { method: 'DELETE', token })
}
