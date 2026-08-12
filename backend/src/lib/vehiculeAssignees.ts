/** Filtre Prisma : utilisateur assigné (colonne principale ou tag [[ASSIGNEES:…]] dans notes). */
export function whereUserAssignedToVehicule(userId: number): Record<string, unknown> {
  const id = String(userId)
  const notesMatch: Record<string, unknown>[] = [
    { notes: { contains: `"technicien_ids":[${id},` } },
    { notes: { contains: `"technicien_ids":[${id}]` } },
    { notes: { contains: `"technicien_ids": [${id},` } },
    { notes: { contains: `"technicien_ids": [${id}]` } },
    { notes: { contains: `"technician_ids":[${id},` } },
    { notes: { contains: `"technician_ids":[${id}]` } },
    { notes: { contains: `"technician_ids": [${id},` } },
    { notes: { contains: `"technician_ids": [${id}]` } },
    { notes: { contains: `"responsable_ids":[${id},` } },
    { notes: { contains: `"responsable_ids":[${id}]` } },
    { notes: { contains: `"responsable_ids": [${id},` } },
    { notes: { contains: `"responsable_ids": [${id}]` } },
    { notes: { contains: `,${id},` } },
    { notes: { contains: `,${id}]` } },
  ]
  return {
    OR: [{ technicien_id: userId }, { responsable_id: userId }, ...notesMatch],
  }
}

/** Même logique que le filtre liste, en mémoire (pour le rapport performance). */
export function isUserAssignedToVehicule(
  userId: number,
  v: { technicien_id: number | null; responsable_id?: number | null; notes: string | null }
): boolean {
  if (v.technicien_id != null && Number(v.technicien_id) === userId) return true
  if (v.responsable_id != null && Number(v.responsable_id) === userId) return true
  const notes = String(v.notes ?? '')
  if (!notes) return false
  const id = String(userId)
  const patterns = [
    `"technicien_ids":[${id},`,
    `"technicien_ids":[${id}]`,
    `"technicien_ids": [${id},`,
    `"technicien_ids": [${id}]`,
    `"technician_ids":[${id},`,
    `"technician_ids":[${id}]`,
    `"technician_ids": [${id},`,
    `"technician_ids": [${id}]`,
    `"responsable_ids":[${id},`,
    `"responsable_ids":[${id}]`,
    `"responsable_ids": [${id},`,
    `"responsable_ids": [${id}]`,
    `,${id},`,
    `,${id}]`,
  ]
  return patterns.some(p => notes.includes(p))
}
