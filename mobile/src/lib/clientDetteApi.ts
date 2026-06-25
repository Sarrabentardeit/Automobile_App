import { apiFetch } from './api'
import type { ClientAvecDette, ClientDetteInput } from '../types/clientDette'

export async function fetchClientsDettes(
  token: string,
  params?: { q?: string }
): Promise<ClientAvecDette[]> {
  const list = await apiFetch<ClientAvecDette[]>('/clients-dettes', {
    token,
    params: { q: params?.q },
  })
  return Array.isArray(list) ? list : []
}

export async function createClientDette(
  token: string,
  data: ClientDetteInput
): Promise<ClientAvecDette> {
  return apiFetch<ClientAvecDette>('/clients-dettes', {
    method: 'POST',
    token,
    body: data,
  })
}

export async function updateClientDette(
  token: string,
  id: number,
  data: ClientDetteInput
): Promise<ClientAvecDette> {
  return apiFetch<ClientAvecDette>(`/clients-dettes/${id}`, {
    method: 'PUT',
    token,
    body: data,
  })
}

export async function deleteClientDette(token: string, id: number): Promise<void> {
  await apiFetch<void>(`/clients-dettes/${id}`, { method: 'DELETE', token })
}
