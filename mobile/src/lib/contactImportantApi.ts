import { apiFetch } from './api'
import type { ContactImportant, ContactImportantInput } from '../types/contactImportant'

export async function fetchContactsImportants(
  token: string,
  params?: { q?: string; categorie?: string }
): Promise<ContactImportant[]> {
  const list = await apiFetch<ContactImportant[]>('/contacts-importants', { token, params })
  return Array.isArray(list) ? list : []
}

export async function createContactImportant(
  token: string,
  data: ContactImportantInput
): Promise<ContactImportant> {
  return apiFetch<ContactImportant>('/contacts-importants', {
    method: 'POST',
    token,
    body: data,
  })
}

export async function updateContactImportant(
  token: string,
  id: number,
  data: ContactImportantInput
): Promise<ContactImportant> {
  return apiFetch<ContactImportant>(`/contacts-importants/${id}`, {
    method: 'PUT',
    token,
    body: data,
  })
}

export async function deleteContactImportant(token: string, id: number): Promise<void> {
  await apiFetch<void>(`/contacts-importants/${id}`, { method: 'DELETE', token })
}
