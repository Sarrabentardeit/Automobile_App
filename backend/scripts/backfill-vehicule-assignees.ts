/**
 * Complète VehiculeAssignee depuis les métadonnées legacy [[ASSIGNEES:…]] dans notes.
 * À lancer une fois après migration : npx ts-node scripts/backfill-vehicule-assignees.ts
 */
import { PrismaClient } from '@prisma/client'
import {
  assigneeIdsFromRows,
  splitNotesAndAssignees,
  syncVehiculeAssignees,
} from '../src/lib/vehiculeAssignees'

const prisma = new PrismaClient()

async function main() {
  const vehicules = await prisma.vehicule.findMany({
    include: { assignees: { select: { userId: true, role: true } } },
  })
  let updated = 0
  let notesCleaned = 0

  for (const v of vehicules) {
    const legacy = splitNotesAndAssignees(v.notes)
    const current = assigneeIdsFromRows(v.assignees)
    const technicien_ids = Array.from(
      new Set([
        ...current.technicien_ids,
        ...legacy.technicien_ids,
        ...(v.technicien_id != null ? [v.technicien_id] : []),
      ])
    )
    const responsable_ids = Array.from(
      new Set([
        ...current.responsable_ids,
        ...legacy.responsable_ids,
        ...(v.responsable_id != null ? [v.responsable_id] : []),
      ])
    )

    const needsSync =
      technicien_ids.length !== current.technicien_ids.length ||
      responsable_ids.length !== current.responsable_ids.length ||
      technicien_ids.some(id => !current.technicien_ids.includes(id)) ||
      responsable_ids.some(id => !current.responsable_ids.includes(id))

    if (needsSync) {
      await syncVehiculeAssignees(prisma, v.id, technicien_ids, responsable_ids)
      updated += 1
    }

    if (legacy.notes !== v.notes.trim() || v.notes.includes('[[ASSIGNEES:')) {
      await prisma.vehicule.update({
        where: { id: v.id },
        data: { notes: legacy.notes },
      })
      notesCleaned += 1
    }
  }

  console.log(`Backfill terminé : ${updated} véhicule(s) synchronisé(s), ${notesCleaned} note(s) nettoyée(s).`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => void prisma.$disconnect())
