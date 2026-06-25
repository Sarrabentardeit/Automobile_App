/** Assignations véhicule ↔ utilisateurs (table VehiculeAssignee). */

export const ASSIGNEES_TAG = '[[ASSIGNEES:'
export const ASSIGNEE_ROLES = ['technicien', 'responsable'] as const
export type AssigneeRole = (typeof ASSIGNEE_ROLES)[number]

export type AssigneeRow = { userId: number; role: string }

export const VEHICULE_ASSIGNEES_INCLUDE = {
  assignees: { select: { userId: true, role: true } },
} as const

export function normalizeIds(input: unknown): number[] {
  if (!Array.isArray(input)) return []
  return Array.from(new Set(input.map(v => Number(v)).filter(v => Number.isInteger(v) && v > 0)))
}

/** Lecture legacy dans notes (migration / compatibilité). */
export function splitNotesAndAssignees(rawNotes: string | null | undefined): {
  notes: string
  technicien_ids: number[]
  responsable_ids: number[]
} {
  const notes = String(rawNotes ?? '')
  const start = notes.lastIndexOf(ASSIGNEES_TAG)
  if (start < 0) return { notes: notes.trim(), technicien_ids: [], responsable_ids: [] }
  const end = notes.indexOf(']]', start)
  if (end < 0) return { notes: notes.trim(), technicien_ids: [], responsable_ids: [] }
  const jsonPart = notes.slice(start + ASSIGNEES_TAG.length, end)
  let technicien_ids: number[] = []
  let responsable_ids: number[] = []
  try {
    const parsed = JSON.parse(jsonPart) as { technicien_ids?: unknown; responsable_ids?: unknown }
    technicien_ids = normalizeIds(parsed.technicien_ids)
    responsable_ids = normalizeIds(parsed.responsable_ids)
  } catch {
    // ignore malformed metadata
  }
  const cleaned = (notes.slice(0, start) + notes.slice(end + 2)).trim()
  return { notes: cleaned, technicien_ids, responsable_ids }
}

export function stripAssigneesFromNotes(rawNotes: string | null | undefined): string {
  return splitNotesAndAssignees(rawNotes).notes
}

export function assigneeIdsFromRows(rows: AssigneeRow[]): {
  technicien_ids: number[]
  responsable_ids: number[]
} {
  const technicien_ids = rows.filter(r => r.role === 'technicien').map(r => r.userId)
  const responsable_ids = rows.filter(r => r.role === 'responsable').map(r => r.userId)
  return { technicien_ids, responsable_ids }
}

export function resolveAssigneeLists(
  body: {
    technicien_id?: number | null
    responsable_id?: number | null
    technicien_ids?: number[]
    responsable_ids?: number[]
  },
  existingRows: AssigneeRow[]
): { technicien_ids: number[]; responsable_ids: number[] } {
  const existing = assigneeIdsFromRows(existingRows)
  const fromBodyTech = normalizeIds(body.technicien_ids)
  const fromBodyResp = normalizeIds(body.responsable_ids)

  let technicien_ids = fromBodyTech.length
    ? fromBodyTech
    : body.technicien_id !== undefined
      ? body.technicien_id != null
        ? [body.technicien_id]
        : []
      : existing.technicien_ids

  let responsable_ids = fromBodyResp.length
    ? fromBodyResp
    : body.responsable_id !== undefined
      ? body.responsable_id != null
        ? [body.responsable_id]
        : []
      : existing.responsable_ids

  if (!fromBodyTech.length && body.technicien_id != null && !technicien_ids.includes(body.technicien_id)) {
    technicien_ids = [body.technicien_id, ...technicien_ids.filter(id => id !== body.technicien_id)]
  }
  if (!fromBodyResp.length && body.responsable_id != null && !responsable_ids.includes(body.responsable_id)) {
    responsable_ids = [body.responsable_id, ...responsable_ids.filter(id => id !== body.responsable_id)]
  }

  return { technicien_ids, responsable_ids }
}

/** Filtre Prisma : utilisateur assigné au véhicule. */
export function whereUserAssignedToVehicule(userId: number): Record<string, unknown> {
  return {
    OR: [
      { technicien_id: userId },
      { responsable_id: userId },
      { assignees: { some: { userId } } },
    ],
  }
}

export async function syncVehiculeAssignees(
  db: {
    user?: { findMany: (args: {
      where: { id: { in: number[] } }
      select: { id: true }
    }) => Promise<Array<{ id: number }>> }
    vehiculeAssignee: {
      deleteMany: (args: { where: { vehiculeId: number } }) => Promise<unknown>
      createMany: (args: {
        data: Array<{ vehiculeId: number; userId: number; role: string }>
        skipDuplicates?: boolean
      }) => Promise<unknown>
    }
  },
  vehiculeId: number,
  technicienIds: number[],
  responsableIds: number[]
): Promise<void> {
  let techIds = technicienIds
  let respIds = responsableIds
  const allIds = Array.from(new Set([...techIds, ...respIds]))
  if (allIds.length && db.user) {
    const valid = await db.user.findMany({
      where: { id: { in: allIds } },
      select: { id: true },
    })
    const validSet = new Set(valid.map(u => u.id))
    techIds = techIds.filter(id => validSet.has(id))
    respIds = respIds.filter(id => validSet.has(id))
  }

  await db.vehiculeAssignee.deleteMany({ where: { vehiculeId } })
  const rows = [
    ...techIds.map(userId => ({ vehiculeId, userId, role: 'technicien' as const })),
    ...respIds.map(userId => ({ vehiculeId, userId, role: 'responsable' as const })),
  ]
  if (rows.length) {
    await db.vehiculeAssignee.createMany({ data: rows, skipDuplicates: true })
  }
}

export function toVehiculeWithAssignees(v: {
  id: number
  immatriculation: string
  modele: string
  type: string
  etat_actuel: string
  service_type: string | null
  technicien_id: number | null
  responsable_id: number | null
  defaut: string
  client_telephone: string
  date_entree: string
  date_sortie: string | null
  notes: string
  derniere_mise_a_jour: string
  avance_client?: number | null
  assignees?: AssigneeRow[]
}) {
  const fromRows = v.assignees?.length ? assigneeIdsFromRows(v.assignees) : null
  const legacy = splitNotesAndAssignees(v.notes)
  const technicien_ids = fromRows?.technicien_ids.length
    ? fromRows.technicien_ids
    : legacy.technicien_ids.length
      ? legacy.technicien_ids
      : v.technicien_id != null
        ? [v.technicien_id]
        : []
  const responsable_ids = fromRows?.responsable_ids.length
    ? fromRows.responsable_ids
    : legacy.responsable_ids.length
      ? legacy.responsable_ids
      : v.responsable_id != null
        ? [v.responsable_id]
        : []

  return {
    id: v.id,
    immatriculation: v.immatriculation,
    modele: v.modele,
    type: v.type as 'voiture' | 'moto',
    etat_actuel: v.etat_actuel,
    service_type: v.service_type ?? undefined,
    technicien_id: technicien_ids[0] ?? v.technicien_id,
    responsable_id: responsable_ids[0] ?? v.responsable_id,
    technicien_ids,
    responsable_ids,
    defaut: v.defaut,
    client_telephone: v.client_telephone,
    date_entree: v.date_entree,
    date_sortie: v.date_sortie,
    notes: legacy.notes,
    derniere_mise_a_jour: v.derniere_mise_a_jour,
    avance_client: v.avance_client ?? 0,
  }
}
