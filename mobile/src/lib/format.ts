export function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = iso.slice(0, 10)
  const [y, m, day] = d.split('-')
  if (!y || !m || !day) return iso
  return `${day}/${m}/${y}`
}

export function daysSince(dateStr: string): number {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 0
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)))
}

export function formatDuree(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h < 24) return m > 0 ? `${h}h ${m}min` : `${h}h`
  const j = Math.floor(h / 24)
  const rh = h % 24
  return rh > 0 ? `${j}j ${rh}h` : `${j}j`
}
