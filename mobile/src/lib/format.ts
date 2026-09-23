export function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = iso.slice(0, 10)
  const [y, m, day] = d.split('-')
  if (!y || !m || !day) return iso
  return `${day}/${m}/${y}`
}

/** Dates lisibles pour listes dashboard (FR). */
export function formatRelativeDateTime(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    return value.slice(5, 16).replace('T', ' ')
  }

  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dayDiff = Math.round((startToday.getTime() - startThat.getTime()) / 86_400_000)
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  if (dayDiff === 0) return `Aujourd’hui ${time}`
  if (dayDiff === 1) return `Hier ${time}`
  if (dayDiff > 1 && dayDiff < 7) {
    const weekday = d.toLocaleDateString('fr-FR', { weekday: 'short' })
    return `${weekday} ${time}`
  }
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
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
