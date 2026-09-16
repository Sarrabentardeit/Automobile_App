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
