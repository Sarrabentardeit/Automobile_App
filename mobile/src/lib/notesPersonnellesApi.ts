import { apiFetch } from './api'
import type { NotePersonnelle, NotePersonnelleInput } from '../types/notePersonnelle'

export async function fetchNotesPersonnelles(
  token: string,
  params?: { q?: string }
): Promise<NotePersonnelle[]> {
  const list = await apiFetch<NotePersonnelle[]>('/notes-personnelles', { token, params })
  return Array.isArray(list) ? list : []
}

export async function createNotePersonnelle(
  token: string,
  data: NotePersonnelleInput
): Promise<NotePersonnelle> {
  return apiFetch<NotePersonnelle>('/notes-personnelles', {
    method: 'POST',
    token,
    body: data,
  })
}

export async function updateNotePersonnelle(
  token: string,
  id: number,
  data: NotePersonnelleInput
): Promise<NotePersonnelle> {
  return apiFetch<NotePersonnelle>(`/notes-personnelles/${id}`, {
    method: 'PUT',
    token,
    body: data,
  })
}

export async function deleteNotePersonnelle(token: string, id: number): Promise<void> {
  await apiFetch<void>(`/notes-personnelles/${id}`, { method: 'DELETE', token })
}
