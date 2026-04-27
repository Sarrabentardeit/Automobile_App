/**
 * GET /vehicules/:id/ordres-reparation/:ordreId/excel
 * Génère un .xlsx pré-rempli depuis le template atelier, avec toutes les données de l'ordre.
 */
import { Router } from 'express'
import ExcelJS from 'exceljs'
import path from 'path'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router({ mergeParams: true })
const db = prisma as any

const TEMPLATE_PATH = path.join(__dirname, '../../templates/ordre-reparation-template.xlsx')

function statutFr(s: string): string {
  if (s === 'fait') return 'Fait'
  if (s === 'na') return 'N/A'
  return 'À faire'
}

type Piece = { quantite?: string | null; produit?: string | null }

function getComplement(raw: unknown): {
  travauxProchains: string
  pieces: Piece[]
  prix: string
  technicienMention: string
  signatureControle: string
  note: string
} {
  const d = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const rawPieces = d.pieces
  const pieces: Piece[] = Array.isArray(rawPieces) ? (rawPieces as Piece[]) : []
  return {
    travauxProchains: typeof d.travauxProchains === 'string' ? d.travauxProchains : '',
    pieces,
    prix: typeof d.prix === 'string' ? d.prix : '',
    technicienMention: typeof d.technicienMention === 'string' ? d.technicienMention : '',
    signatureControle: typeof d.signatureControle === 'string' ? d.signatureControle : '',
    note: typeof d.note === 'string' ? d.note : '',
  }
}

/** Écrit une valeur dans une cellule en conservant le style existant */
function writeCell(sheet: ExcelJS.Worksheet, ref: string, value: string | number | null) {
  const cell = sheet.getCell(ref)
  cell.value = value ?? ''
}

router.get('/:id/ordres-reparation/:ordreId/excel', authenticate(), async (req, res) => {
  try {
    const vehiculeId = Number(req.params.id)
    const ordreId = Number(req.params.ordreId)
    if (isNaN(vehiculeId) || isNaN(ordreId)) {
      return res.status(400).json({ error: 'ID invalide' })
    }

    const ordre = await db.ordreReparation.findFirst({
      where: { id: ordreId, vehiculeId },
      include: { lignes: true },
    })
    if (!ordre) return res.status(404).json({ error: 'Ordre introuvable' })

    const comp = getComplement(ordre.complementJson)
    const lignes: Array<{ description: string; statut: string; ordre: number }> = (
      ordre.lignes as Array<{ description: string; statut: string; ordre: number }>
    )
      .slice()
      .sort((a, b) => a.ordre - b.ordre)

    // Charger le template
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(TEMPLATE_PATH)

    const sheet = workbook.worksheets[0]
    if (!sheet) return res.status(500).json({ error: 'Template invalide' })

    // ── Champs d'en-tête (lignes 4-7) ──────────────────────────────────────
    writeCell(sheet, 'C4', ordre.clientNom || '')
    writeCell(sheet, 'F4', ordre.clientTelephone || '')
    writeCell(sheet, 'C5', ordre.voiture || '')
    writeCell(sheet, 'F5', ordre.immatriculation || '')
    writeCell(sheet, 'C6', ordre.kilometrage != null ? String(ordre.kilometrage) : '')
    writeCell(sheet, 'F6', ordre.technicien || '')
    writeCell(sheet, 'C7', ordre.dateEntree || '')
    writeCell(sheet, 'F7', ordre.vin || '')

    // ── Travaux demandés (lignes 10-29) ─────────────────────────────────────
    for (let i = 0; i < 20; i++) {
      const row = 10 + i
      const ligne = lignes[i]
      writeCell(sheet, `B${row}`, ligne ? ligne.description : '')
      writeCell(sheet, `D${row}`, ligne ? statutFr(ligne.statut) : '')
    }

    // ── Quantité / Produits-Pièces (7 paires de lignes) ─────────────────────
    // Paires de lignes : (31-32), (33-34), (35-36), (37-38), (39-40), (41-42), (43-44)
    const pieceStartRows = [31, 33, 35, 37, 39, 41, 43]
    for (let i = 0; i < pieceStartRows.length; i++) {
      const startRow = pieceStartRows[i]
      const piece = comp.pieces[i]
      writeCell(sheet, `B${startRow}`, piece?.quantite || '')
      writeCell(sheet, `C${startRow}`, piece?.produit || '')
    }

    // ── Travaux prochains (cellule fusionnée E24:H42) ────────────────────────
    writeCell(sheet, 'E24', comp.travauxProchains || '')

    // ── Prix / Technicien (bas du bloc droit) ────────────────────────────────
    // E44 contient le label "PRIX :" — on complète avec la valeur dans la cellule adjacente
    // Mais E44:H44 est fusionné → on met label+valeur dans la même cellule fusionnée
    if (comp.prix) {
      const prixCell = sheet.getCell('E44')
      prixCell.value = `PRIX :   ${comp.prix}`
    }
    if (comp.technicienMention) {
      const techCell = sheet.getCell('E45')
      techCell.value = `TECHNICIEN:   ${comp.technicienMention}`
    }

    // ── Signature (ligne 47) ─────────────────────────────────────────────────
    // B47:E47 = label. La valeur va en F47
    if (comp.signatureControle) {
      writeCell(sheet, 'F47', comp.signatureControle)
    }

    // ── Note (zone B49:H59) ───────────────────────────────────────────────────
    writeCell(sheet, 'B49', `NOTE :\n${comp.note}`)

    // ── Numéro de fiche (optionnel, sur la ligne 8 si dispo) ─────────────────
    writeCell(sheet, 'B8', `N° ${ordre.numero || `OR-${ordre.id}`}`)

    // ── Envoi ─────────────────────────────────────────────────────────────────
    const safeName = (ordre.numero || `OR-${ordre.id}`).replace(/[/\\?%*:|"<>]/g, '-')
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeName)}.xlsx"`)

    await workbook.xlsx.write(res)
    res.end()
  } catch (err) {
    console.error('[excel] error:', err)
    if (!res.headersSent) res.status(500).json({ error: 'Erreur génération Excel' })
  }
})

export default router
