import { apiFetch } from './api'
import type { Client, ClientInput } from '../types/client'

export type ClientsListResponse = {
  data: Client[]
  total: number
  page: number
  limit: number
}

export async function fetchClients(
  token: string,
  params?: { q?: string; page?: number; limit?: number }
): Promise<ClientsListResponse> {
  return apiFetch<ClientsListResponse>('/clients', { token, params })
}

export async function fetchClientStats(token: string): Promise<{ total: number }> {
  return apiFetch<{ total: number }>('/clients/stats', { token })
}

export async function fetchClient(token: string, id: number): Promise<Client> {
  return apiFetch<Client>(`/clients/${id}`, { token })
}

export async function createClient(token: string, data: ClientInput): Promise<Client> {
  return apiFetch<Client>('/clients', { method: 'POST', token, body: data })
}

export async function updateClient(
  token: string,
  id: number,
  data: Partial<ClientInput>
): Promise<Client> {
  return apiFetch<Client>(`/clients/${id}`, { method: 'PUT', token, body: data })
}

export async function deleteClient(token: string, id: number): Promise<void> {
  await apiFetch<void>(`/clients/${id}`, { method: 'DELETE', token })
}
