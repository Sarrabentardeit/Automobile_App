import { apiFetch } from './api'
import { mapRole, mergePermissions, ROLE_PRESETS, type Role } from '../types/permissions'
import type { AppAccount, AppAccountCreate, AppAccountUpdate } from '../types/appUser'

type ApiUserRow = {
  id: number
  email: string
  nom_complet: string
  telephone?: string
  role: string
  permissions?: unknown
  statut: string
  date_creation: string
  derniere_connexion?: string | null
}

function mapApiUser(raw: ApiUserRow): AppAccount {
  const role = mapRole(raw.role)
  return {
    id: raw.id,
    email: raw.email,
    nom_complet: raw.nom_complet,
    telephone: raw.telephone ?? '',
    role,
    permissions: mergePermissions(raw.role, raw.permissions),
    statut: raw.statut === 'inactif' ? 'inactif' : 'actif',
    date_creation: raw.date_creation,
    derniere_connexion: raw.derniere_connexion ?? null,
  }
}

export async function fetchAppAccounts(token: string): Promise<AppAccount[]> {
  const list = await apiFetch<ApiUserRow[]>('/users', { token })
  return Array.isArray(list) ? list.map(mapApiUser) : []
}

export async function createAppAccount(
  token: string,
  data: AppAccountCreate
): Promise<AppAccount> {
  const raw = await apiFetch<ApiUserRow>('/users', {
    method: 'POST',
    token,
    body: {
      fullName: data.nom_complet,
      email: data.email,
      telephone: data.telephone,
      password: data.password,
      role: data.role,
      permissions: data.permissions,
    },
  })
  return mapApiUser(raw)
}

export async function updateAppAccount(
  token: string,
  id: number,
  data: AppAccountUpdate
): Promise<AppAccount> {
  const body: Record<string, unknown> = {}
  if (data.nom_complet != null) body.fullName = data.nom_complet
  if (data.telephone != null) body.telephone = data.telephone
  if (data.role != null) body.role = data.role
  if (data.permissions != null) body.permissions = data.permissions
  if (data.statut != null) body.statut = data.statut
  if (data.password != null) body.password = data.password

  const raw = await apiFetch<ApiUserRow>(`/users/${id}`, {
    method: 'PUT',
    token,
    body,
  })
  return mapApiUser(raw)
}

export async function deleteAppAccount(token: string, id: number): Promise<void> {
  await apiFetch<void>(`/users/${id}`, { method: 'DELETE', token })
}

export function cloneRolePermissions(role: Role) {
  return { ...ROLE_PRESETS[role] }
}
