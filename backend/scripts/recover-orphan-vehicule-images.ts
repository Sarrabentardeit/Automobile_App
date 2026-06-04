/**
 * Recherche les fichiers photo sur disque sans entrée en base (VehiculeImage),
 * puis peut les réimporter avec --apply.
 *
 * Usage (depuis backend/) :
 *   npx ts-node scripts/recover-orphan-vehicule-images.ts
 *   npx ts-node scripts/recover-orphan-vehicule-images.ts --vehicule-id=340
 *   npx ts-node scripts/recover-orphan-vehicule-images.ts --vehicule-id=340 --apply
 */
import fs from 'fs/promises'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads', 'vehicules')

function mimeFromExt(ext: string): string {
  const e = ext.toLowerCase()
  if (e === '.png') return 'image/png'
  if (e === '.webp') return 'image/webp'
  if (e === '.heic') return 'image/heic'
  return 'image/jpeg'
}

function parseArgs() {
  const vehiculeIdArg = process.argv.find(a => a.startsWith('--vehicule-id='))
  const vehiculeId = vehiculeIdArg ? Number(vehiculeIdArg.split('=')[1]) : null
  const apply = process.argv.includes('--apply')
  return { vehiculeId: vehiculeId != null && !isNaN(vehiculeId) ? vehiculeId : null, apply }
}

async function listVehicleDirs(vehiculeId: number | null): Promise<string[]> {
  try {
    const entries = await fs.readdir(UPLOADS_ROOT, { withFileTypes: true })
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name)
    if (vehiculeId != null) {
      const id = String(vehiculeId)
      return dirs.includes(id) ? [id] : []
    }
    return dirs.filter(d => /^\d+$/.test(d))
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(`Dossier absent : ${UPLOADS_ROOT}`)
      return []
    }
    throw err
  }
}

async function main() {
  const { vehiculeId, apply } = parseArgs()
  const prisma = new PrismaClient()

  try {
    const dbImages = await prisma.vehiculeImage.findMany({
      where: vehiculeId != null ? { vehiculeId } : undefined,
      select: { id: true, vehiculeId: true, url_path: true },
    })

    const knownPaths = new Set(dbImages.map(i => i.url_path.replace(/\\/g, '/')))
    const knownFileNames = new Set(
      dbImages.map(i => path.basename(i.url_path.replace(/\\/g, '/')))
    )

    const vehicleDirs = await listVehicleDirs(vehiculeId)
    const orphans: { vehiculeId: number; fileName: string; diskPath: string; url_path: string; size: number }[] = []

    for (const dir of vehicleDirs) {
      const vid = Number(dir)
      if (isNaN(vid)) continue
      const vehiculeDir = path.join(UPLOADS_ROOT, dir)
      const files = await fs.readdir(vehiculeDir, { withFileTypes: true })
      for (const f of files) {
        if (!f.isFile()) continue
        const fileName = f.name
        const url_path = `/uploads/vehicules/${vid}/${fileName}`
        if (knownPaths.has(url_path) || knownFileNames.has(fileName)) continue
        const diskPath = path.join(vehiculeDir, fileName)
        const stat = await fs.stat(diskPath)
        orphans.push({ vehiculeId: vid, fileName, diskPath, url_path, size: stat.size })
      }
    }

    if (orphans.length === 0) {
      console.log(
        vehiculeId != null
          ? `Aucun fichier orphelin pour le véhicule #${vehiculeId} dans ${UPLOADS_ROOT}`
          : `Aucun fichier orphelin dans ${UPLOADS_ROOT}`
      )
      console.log(
        '\n→ Si des photos ont été prises via le navigateur sans enregistrer le formulaire,\n' +
          '  elles ne sont pas sur le serveur : vérifier la galerie du téléphone de l’utilisateur.'
      )
      return
    }

    console.log(`${orphans.length} fichier(s) sur disque sans entrée en base :\n`)
    for (const o of orphans) {
      console.log(`  véhicule #${o.vehiculeId}  ${o.fileName}  (${Math.round(o.size / 1024)} Ko)`)
      console.log(`    ${o.url_path}`)
    }

    if (!apply) {
      console.log('\nPour créer les entrées en base : relancer avec --apply')
      return
    }

    let imported = 0
    for (const o of orphans) {
      const vehicule = await prisma.vehicule.findUnique({ where: { id: o.vehiculeId } })
      if (!vehicule) {
        console.warn(`  Ignoré (véhicule #${o.vehiculeId} introuvable) : ${o.fileName}`)
        continue
      }
      const ext = path.extname(o.fileName)
      await prisma.vehiculeImage.create({
        data: {
          vehiculeId: o.vehiculeId,
          url_path: o.url_path,
          original_name: o.fileName,
          mime_type: mimeFromExt(ext),
          size_bytes: o.size,
          category: 'etat_exterieur',
          note: 'Récupération fichier orphelin',
          created_by: 'recover-orphan-vehicule-images',
        },
      })
      imported += 1
      console.log(`  Importé : ${o.url_path}`)
    }
    console.log(`\n${imported} photo(s) réimportée(s) en base.`)
  } finally {
    await prisma.$disconnect()
  }
}

void main().catch(err => {
  console.error(err)
  process.exit(1)
})
