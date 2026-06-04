import type { Reclamation } from '../types/reclamation'

/** Texte d’assignation aligné web ReclamationPage. */
export function formatReclamationAssignText(r: Reclamation): string | null {
  const hasAssigne = !!r.assigneA?.trim()
  const techCount = r.techniciens?.length ?? 0
  if (!hasAssigne && techCount === 0) return null

  let text = ''
  if (hasAssigne) text = `Assigné à ${r.assigneA}`
  if (techCount > 0) {
    const extra = hasAssigne ? techCount : Math.max(0, techCount - 1)
    if (extra > 0) {
      text += `${hasAssigne ? ' ' : ''}(+ ${extra} pers.)`
    }
  }
  return text || null
}

export function formatDateFr(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!d) return iso
  return `${d}/${m}/${y}`
}
