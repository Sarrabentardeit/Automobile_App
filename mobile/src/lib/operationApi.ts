import { apiFetch } from './api'

export type GarageOperation = {
  id: number
  nom: string
  cle: string | null
  actif: boolean
}

export type OperationEntry = {
  id: number
  date: string
  vehicule: string
  typeTravaux: string
  prixGarage: number | null
  prix: number
}

export function fetchOperations(token: string) {
  return apiFetch<GarageOperation[]>('/operations', { token })
}

export function createOperation(token: string, nom: string) {
  return apiFetch<GarageOperation>('/operations', { method: 'POST', token, body: { nom } })
}

export function fetchOperationEntries(token: string, operationId: number) {
  return apiFetch<{ operation: GarageOperation; entries: OperationEntry[] }>(
    `/operations/${operationId}/entries`,
    { token }
  )
}

export function createOperationEntry(
  token: string,
  operationId: number,
  body: Omit<OperationEntry, 'id'>
) {
  return apiFetch<OperationEntry>(`/operations/${operationId}/entries`, {
    method: 'POST',
    token,
    body,
  })
}

export function deleteOperationEntry(token: string, operationId: number, entryId: number) {
  return apiFetch<void>(`/operations/${operationId}/entries/${entryId}`, {
    method: 'DELETE',
    token,
  })
}
