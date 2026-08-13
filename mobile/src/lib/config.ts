/** URL API — sur téléphone, localhost ne fonctionne pas : utilisez l’URL prod ou l’IP du PC en dev. */
export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'https://mecano.nav.ovh/api'

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${p}`
}

/** Fichiers statiques /uploads/... (hors préfixe /api). */
export function resolveUploadUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  const origin = API_BASE.replace(/\/api\/?$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${origin}${p}`
}
