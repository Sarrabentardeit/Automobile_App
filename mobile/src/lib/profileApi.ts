import { apiFetch } from './api'

export type ProfileUpdateResult = {
  id: number
  email: string
  fullName: string
  telephone: string
  avatarUrl: string | null
  role: string
}

export function updateMyProfile(
  token: string,
  data: {
    fullName: string
    telephone?: string
    avatarDataUrl?: string | null
    removeAvatar?: boolean
  }
) {
  return apiFetch<ProfileUpdateResult>('/users/me', {
    method: 'PATCH',
    token,
    body: {
      fullName: data.fullName.trim(),
      telephone: data.telephone ?? '',
      avatarDataUrl: data.avatarDataUrl,
      removeAvatar: data.removeAvatar,
    },
  }).then((r) => ({
    ...r,
    fullName: r.fullName || (r as { nom_complet?: string }).nom_complet || data.fullName.trim(),
    avatarUrl: r.avatarUrl ?? null,
  }))
}
