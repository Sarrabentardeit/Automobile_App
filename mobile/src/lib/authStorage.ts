import * as SecureStore from 'expo-secure-store'
import { mergePermissions, type Permissions } from '../types/permissions'

const KEY_ACCESS = 'elmecano_access_token'
const KEY_REFRESH = 'elmecano_refresh_token'
const KEY_USER = 'elmecano_user'

export type StoredUser = {
  id: number
  email: string
  fullName: string
  role: string
  permissions: Permissions
}

/** Garantit les permissions (sessions enregistrées avant la mise à jour mobile). */
export function normalizeStoredUser(raw: Partial<StoredUser> & {
  id: number
  email: string
  fullName: string
  role: string
}): StoredUser {
  return {
    id: raw.id,
    email: raw.email,
    fullName: raw.fullName,
    role: raw.role || 'technicien',
    permissions: raw.permissions ?? mergePermissions(raw.role || 'technicien', undefined),
  }
}

export async function saveSession(
  user: StoredUser,
  accessToken: string,
  refreshToken: string
): Promise<void> {
  await SecureStore.setItemAsync(KEY_USER, JSON.stringify(user))
  await SecureStore.setItemAsync(KEY_ACCESS, accessToken)
  await SecureStore.setItemAsync(KEY_REFRESH, refreshToken)
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_REFRESH)
}

export async function updateAccessTokens(
  accessToken: string,
  refreshToken?: string
): Promise<void> {
  await SecureStore.setItemAsync(KEY_ACCESS, accessToken)
  if (refreshToken) await SecureStore.setItemAsync(KEY_REFRESH, refreshToken)
}

export async function loadSession(): Promise<{
  user: StoredUser
  accessToken: string
} | null> {
  const userRaw = await SecureStore.getItemAsync(KEY_USER)
  const accessToken = await SecureStore.getItemAsync(KEY_ACCESS)
  if (!userRaw || !accessToken) return null
  try {
    const parsed = JSON.parse(userRaw) as Partial<StoredUser> & {
      id: number
      email: string
      fullName: string
      role: string
    }
    const user = normalizeStoredUser(parsed)
    if (!parsed.permissions) {
      await SecureStore.setItemAsync(KEY_USER, JSON.stringify(user))
    }
    return { user, accessToken }
  } catch {
    return null
  }
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_USER)
  await SecureStore.deleteItemAsync(KEY_ACCESS)
  await SecureStore.deleteItemAsync(KEY_REFRESH)
}
