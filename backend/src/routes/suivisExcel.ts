/**
 * GET /vehicules/:id/suivis/:suiviId/excel
 * Génère un .xlsx pré-rempli depuis le template Facture-suivi.
 */
import { Router } from 'express'
import ExcelJS from 'exceljs'
import path from 'path'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router({ mergeParams: true })
const db = prisma as any

const TEMPLATE_PATH = path.join(__dirname, '../../templates/suivi-template.xlsx')

function writeCell(sheet: ExcelJS.Worksheet, ref: string, value: string | number | null) {
  const cell = sheet.getCell(ref)
  cell.value = value ?? ''
}

router.get('/:id/suivis/:suiviId/excel', authenticate(), async (req, res) => {
  try {
    const vehiculeId = Number(req.params.id)
    const suiviId = Number(req.params.suiviId)
    if (isNaN(vehiculeId) || isNaN(suiviId))
      return res.status(400).json({ error: 'ID invalide' })

    const suivi = await db.vehiculeSuivi.findFirst({ where: { id: suiviId, vehiculeId } })
    if (!suivi) return res.status(404).json({ error: 'Suivi introuvable' })

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(TEMPLATE_PATH)
    const sheet = workbook.worksheets[0]
    if (!sheet) return res.status(500).json({ error: 'Template invalide' })

    // En-tête (lignes 3-4)
    writeCell(sheet, 'C3', suivi.date || '')
    writeCell(sheet, 'E3', suivi.voiture || '')
    writeCell(sheet, 'C4', suivi.kilometrage || '')
    writeCell(sheet, 'E4', suivi.matricule || '')

    // Corps : 3 colonnes côte à côte (lignes 7-18)
    const travEffLines = (suivi.travauxEffectues || '').split('\n')
    const travProchLines = (suivi.travauxProchains || '').split('\n')
    const produitsLines = (suivi.produitsUtilises || '').split('\n')
    for (let i = 0; i < 12; i++) {
      const row = 7 + i
      writeCell(sheet, `B${row}`, travEffLines[i] ?? '')
      writeCell(sheet, `D${row}`, travProchLines[i] ?? '')
      writeCell(sheet, `F${row}`, produitsLines[i] ?? '')
    }

    // Technicien (ligne 20)
    writeCell(sheet, 'B20', suivi.technicien || '')

    const safeName = (suivi.numero || `SV-${suivi.id}`).replace(/[/\\?%*:|"<>]/g, '-')
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeName)}.xlsx"`)
    await workbook.xlsx.write(res)
    res.end()
  } catch (err) {
    console.error('[suivi-excel]', err)
    if (!res.headersSent) res.status(500).json({ error: 'Erreur génération Excel' })
  }
})

export default router
