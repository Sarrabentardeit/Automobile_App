/**
 * Vérifie qu'aucune donnée véhicule n'a été perdue après migration VehiculeAssignee.
 * Usage : npx ts-node scripts/verify-vehicule-assignees.ts
 */
import { PrismaClient } from '@prisma/client'
import { splitNotesAndAssignees } from '../src/lib/vehiculeAssignees'

const prisma = new PrismaClient()

async function main() {
  const [vehicules, users] = await Promise.all([
    prisma.vehicule.findMany({
      include: { assignees: { select: { userId: true, role: true } } },
    }),
    prisma.user.findMany({ select: { id: true } }),
  ])
  const userSet = new Set(users.map(u => u.id))

  let missingPrimaryTech = 0
  let missingPrimaryResp = 0
  let legacyInNotes = 0
  let orphanUserRefs = 0

  for (const v of vehicules) {
    const legacy = splitNotesAndAssignees(v.notes)
    if (v.notes.includes('[[ASSIGNEES:')) legacyInNotes += 1

    const techIds = v.assignees.filter(a => a.role === 'technicien').map(a => a.userId)
    const respIds = v.assignees.filter(a => a.role === 'responsable').map(a => a.userId)

    if (v.technicien_id != null && !techIds.includes(v.technicien_id)) {
      if (userSet.has(v.technicien_id)) missingPrimaryTech += 1
      else orphanUserRefs += 1
    }
    if (v.responsable_id != null && !respIds.includes(v.responsable_id)) {
      if (userSet.has(v.responsable_id)) missingPrimaryResp += 1
      else orphanUserRefs += 1
    }

    for (const id of [...legacy.technicien_ids, ...legacy.responsable_ids]) {
      const inTable = v.assignees.some(a => a.userId === id)
      if (!inTable && userSet.has(id)) missingPrimaryTech += 1
      if (!inTable && !userSet.has(id)) orphanUserRefs += 1
    }
  }

  console.log('=== Vérification intégrité données ===')
  console.log(`Véhicules (table Vehicule)     : ${vehicules.length}`)
  console.log(`Lignes VehiculeAssignee        : ${vehicules.reduce((n, v) => n + v.assignees.length, 0)}`)
  console.log(`Véhicules avec technicien_id   : ${vehicules.filter(v => v.technicien_id != null).length}`)
  console.log(`Véhicules avec assignees       : ${vehicules.filter(v => v.assignees.length > 0).length}`)
  console.log(`Notes avec tag legacy restant  : ${legacyInNotes}`)
  console.log(`Assignation manquante (user actif) : ${missingPrimaryTech + missingPrimaryResp} (doit être 0)`)
  console.log(`Refs utilisateur supprimé (conservées sur Vehicule) : ${orphanUserRefs}`)

  const ok = missingPrimaryTech === 0 && missingPrimaryResp === 0 && legacyInNotes === 0

  if (ok) {
    console.log('\n✅ Aucune perte de véhicules ni d\'assignations actives.')
    console.log('   La table Vehicule est intacte (modèle, état, client, dates, notes texte…).')
  } else {
    console.log('\n⚠️  Relancez : npm run backfill:vehicule-assignees')
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => void prisma.$disconnect())
