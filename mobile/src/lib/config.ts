/** URL API — sur téléphone, localhost ne fonctionne pas : utilisez l’URL prod ou l’IP du PC en dev. */
export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'https://mecano.nav.ovh/api'

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${p}`
}
