import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuree(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return '-'
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h < 24) return m > 0 ? `${h}h${m}min` : `${h}h`
  const j = Math.floor(h / 24)
  const rh = h % 24
  return rh > 0 ? `${j}j ${rh}h` : `${j}j`
}

/** Parse une date YYYY-MM-DD (ou ISO avec T) sans décalage fuseau (évite jour précédent/suivant) */
export function parseDateOnly(dateStr: string): Date {
  const datePart = dateStr.split('T')[0]
  const [y, m, d] = datePart.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function formatDate(dateStr: string): string {
  return parseDateOnly(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export function formatDateTime(dateStr: string): string {
  const d = dateStr.includes('T') ? new Date(dateStr) : parseDateOnly(dateStr)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - parseDateOnly(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

export function getUserDisplayName(userId: number | null, users: { id: number; nom_complet: string }[]): string {
  if (!userId) return '-'
  return users.find(u => u.id === userId)?.nom_complet ?? '-'
}

/** Liste complète des noms (techniciens / responsables multiples). */
export function getUserDisplayNames(
  userIds: number[] | undefined,
  fallbackId: number | null,
  users: { id: number; nom_complet: string }[]
): string {
  const list = userIds?.length ? userIds : fallbackId != null ? [fallbackId] : []
  if (list.length === 0) return '-'
  const names = list
    .map(id => users.find(u => u.id === id)?.nom_complet)
    .filter((name): name is string => Boolean(name))
  return names.length ? names.join(', ') : '-'
}

/** Trouve l'id utilisateur par nom (ex. membre équipe → utilisateur) */
export function findUserIdByName(users: { id: number; nom_complet: string }[], memberName: string): number | null {
  const q = memberName.trim().toLowerCase()
  if (!q) return null
  const exact = users.find(u => u.nom_complet.toLowerCase() === q)
  if (exact) return exact.id
  const partial = users.find(u => u.nom_complet.toLowerCase().includes(q) || q.includes(u.nom_complet.toLowerCase()))
  return partial?.id ?? null
}

/** Retire la métadonnée interne [[ASSIGNEES:…]] (techniciens/responsables multiples). */
export function stripVehiculeAssigneesMeta(text: string | null | undefined): string {
  return parseVehiculeAssigneesFromText(text).notes
}

function normalizeAssigneeIds(input: unknown): number[] {
  if (!Array.isArray(input)) return []
  return Array.from(new Set(input.map(v => Number(v)).filter(v => Number.isInteger(v) && v > 0)))
}

function extractAssigneesFromJsonValue(value: unknown): {
  technicien_ids: number[]
  responsable_ids: number[]
} | null {
  if (!value || typeof value !== 'object') return null
  const o = value as Record<string, unknown>
  if (o.ASSIGNEES && typeof o.ASSIGNEES === 'object') {
    const a = o.ASSIGNEES as Record<string, unknown>
    return {
      technicien_ids: normalizeAssigneeIds(a.technicien_ids ?? a.technician_ids),
      responsable_ids: normalizeAssigneeIds(a.responsable_ids),
    }
  }
  if ('technicien_ids' in o || 'technician_ids' in o || 'responsable_ids' in o) {
    return {
      technicien_ids: normalizeAssigneeIds(o.technicien_ids ?? o.technician_ids),
      responsable_ids: normalizeAssigneeIds(o.responsable_ids),
    }
  }
  return null
}

function extractJsonAssigneeBlock(text: string): { json: string; start: number; end: number } | null {
  const idx = text.indexOf('ASSIGNEES')
  if (idx < 0) return null
  let start = -1
  for (let i = idx; i >= 0; i--) {
    if (text[i] === '{' || text[i] === '[') {
      start = i
      break
    }
  }
  if (start < 0) return null
  const stack: string[] = []
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (c === '{' || c === '[') stack.push(c === '{' ? '}' : ']')
    else if (c === '}' || c === ']') {
      if (stack.length === 0 || stack[stack.length - 1] !== c) continue
      stack.pop()
      if (stack.length === 0) {
        return { json: text.slice(start, i + 1), start, end: i + 1 }
      }
    }
  }
  return null
}

/** Extrait technicien/responsable IDs et texte notes sans métadonnées (formats legacy inclus). */
export function parseVehiculeAssigneesFromText(text: string | null | undefined): {
  notes: string
  technicien_ids: number[]
  responsable_ids: number[]
} {
  let raw = String(text ?? '')
  let technicien_ids: number[] = []
  let responsable_ids: number[] = []

  const merge = (t: number[], r: number[]) => {
    technicien_ids = Array.from(new Set([...technicien_ids, ...t]))
    responsable_ids = Array.from(new Set([...responsable_ids, ...r]))
  }

  const tag = '[[ASSIGNEES:'
  let start = raw.lastIndexOf(tag)
  while (start >= 0) {
    const end = raw.indexOf(']]', start)
    if (end < 0) break
    try {
      const parsed = JSON.parse(raw.slice(start + tag.length, end)) as Record<string, unknown>
      merge(
        normalizeAssigneeIds(parsed.technicien_ids ?? parsed.technician_ids),
        normalizeAssigneeIds(parsed.responsable_ids)
      )
    } catch {
      /* ignore */
    }
    raw = (raw.slice(0, start) + raw.slice(end + 2)).trim()
    start = raw.lastIndexOf(tag)
  }

  let block = extractJsonAssigneeBlock(raw)
  while (block) {
    try {
      let parsed: unknown = JSON.parse(block.json)
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const extracted = extractAssigneesFromJsonValue(item)
          if (extracted) merge(extracted.technicien_ids, extracted.responsable_ids)
        }
      } else {
        const extracted = extractAssigneesFromJsonValue(parsed)
        if (extracted) merge(extracted.technicien_ids, extracted.responsable_ids)
      }
      raw = (raw.slice(0, block.start) + raw.slice(block.end)).trim()
    } catch {
      break
    }
    block = extractJsonAssigneeBlock(raw)
  }

  return { notes: raw.trim(), technicien_ids, responsable_ids }
}

/** Fusionne les assignations API + métadonnées éventuelles dans notes/defaut. */
export function resolveVehiculeAssigneeIds(
  vehicule: {
    technicien_id?: number | null
    responsable_id?: number | null
    technicien_ids?: number[]
    responsable_ids?: number[]
    notes?: string
    defaut?: string
  }
): { technicien_ids: number[]; responsable_ids: number[] } {
  const fromNotes = parseVehiculeAssigneesFromText(vehicule.notes)
  const fromDefaut = parseVehiculeAssigneesFromText(vehicule.defaut)
  const technicien_ids = Array.from(
    new Set([
      ...(vehicule.technicien_ids ?? []),
      ...fromNotes.technicien_ids,
      ...fromDefaut.technicien_ids,
      ...(vehicule.technicien_id != null ? [vehicule.technicien_id] : []),
    ])
  )
  const responsable_ids = Array.from(
    new Set([
      ...(vehicule.responsable_ids ?? []),
      ...fromNotes.responsable_ids,
      ...fromDefaut.responsable_ids,
      ...(vehicule.responsable_id != null ? [vehicule.responsable_id] : []),
    ])
  )
  return { technicien_ids, responsable_ids }
}
