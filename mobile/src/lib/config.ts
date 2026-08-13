/** URL API — sur téléphone, localhost ne fonctionne pas : utilisez l’URL prod ou l’IP du PC en dev. */
export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'https://mecano.nav.ovh/api'

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${p}`
}

/**
 * Fichiers /uploads/... :
 * - prod (API_BASE …/api) → …/api/uploads/... (nginx)
 * - local (API_BASE …:4000) → …:4000/uploads/...
 */
export function resolveUploadUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  const base = API_BASE.replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}
