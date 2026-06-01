import fs from 'fs'
import path from 'path'
import ExcelJS from 'exceljs'

export const TEMPLATE_DIR = path.join(__dirname, '../../templates')

const DEFAULT_CARDS = [
  { id: 'ordre-reparation', title: 'Ordre de reparation', fileName: 'ordre-reparation-template.xlsx', usage: 'Fiche atelier du vehicule (apercu, impression, export Excel).' },
  { id: 'suivi', title: 'Fiche suivi atelier', fileName: 'suivi-template.xlsx', usage: 'Suivi travaux effectues / prochains et produits utilises.' },
  { id: 'suivi-diag', title: 'Suivi DIAG', fileName: 'suivi-diag-template.xlsx', usage: 'Modele DIAG a centraliser dans l application.' },
  { id: 'suivi-diag-achat', title: 'Suivi DIAG achat', fileName: 'suivi-diag-achat-template.xlsx', usage: 'Modele DIAG achat a centraliser dans l application.' },
] as const

async function writeWorkbook(filePath: string, build: (wb: ExcelJS.Workbook) => void): Promise<void> {
  const wb = new ExcelJS.Workbook()
  build(wb)
  await wb.xlsx.writeFile(filePath)
}

function buildOrdreReparationTemplate(wb: ExcelJS.Workbook): void {
  const sheet = wb.addWorksheet('Ordre de reparation')
  sheet.getCell('A1').value = 'ORDRE DE REPARATION — EL MECANO'
  sheet.getCell('B3').value = 'Client'
  sheet.getCell('E3').value = 'Telephone'
  sheet.getCell('B4').value = 'Voiture'
  sheet.getCell('E4').value = 'Immatriculation'
  sheet.getCell('B5').value = 'Kilometrage'
  sheet.getCell('E5').value = 'Technicien'
  sheet.getCell('B6').value = 'Date entree'
  sheet.getCell('E6').value = 'VIN'
  sheet.getCell('B7').value = 'N° fiche'
  sheet.getCell('B9').value = 'Travaux demandes'
  sheet.getCell('D9').value = 'Statut'
  for (let i = 0; i < 20; i++) {
    const row = 10 + i
    sheet.getCell(`B${row}`).value = ''
    sheet.getCell(`D${row}`).value = ''
  }
  sheet.mergeCells('E24:H42')
  sheet.getCell('E24').value = 'Travaux prochains'
  sheet.getCell('B30').value = 'Quantite'
  sheet.getCell('C30').value = 'Produit / Piece'
  for (const startRow of [31, 33, 35, 37, 39, 41, 43]) {
    sheet.getCell(`B${startRow}`).value = ''
    sheet.getCell(`C${startRow}`).value = ''
  }
  sheet.mergeCells('E44:H44')
  sheet.getCell('E44').value = 'PRIX :'
  sheet.mergeCells('E45:H45')
  sheet.getCell('E45').value = 'TECHNICIEN:'
  sheet.getCell('B47').value = 'Signature controle'
  sheet.getCell('F47').value = ''
  sheet.mergeCells('B49:H59')
  sheet.getCell('B49').value = 'NOTE :'
}

function buildSuiviTemplate(wb: ExcelJS.Workbook): void {
  const sheet = wb.addWorksheet('Suivi atelier')
  sheet.getCell('A1').value = 'FICHE SUIVI ATELIER — EL MECANO'
  sheet.getCell('B2').value = 'Date'
  sheet.getCell('D2').value = 'Voiture'
  sheet.getCell('B6').value = 'Travaux effectues'
  sheet.getCell('D6').value = 'Travaux prochains'
  sheet.getCell('F6').value = 'Produits utilises'
  for (let i = 0; i < 12; i++) {
    const row = 7 + i
    sheet.getCell(`B${row}`).value = ''
    sheet.getCell(`D${row}`).value = ''
    sheet.getCell(`F${row}`).value = ''
  }
  sheet.getCell('B19').value = 'Technicien'
  sheet.getCell('B20').value = ''
}

function buildDiagTemplate(wb: ExcelJS.Workbook, title: string): void {
  const sheet = wb.addWorksheet('DIAG')
  sheet.getCell('A1').value = title
  sheet.getCell('A3').value = 'Modele a personnaliser depuis la page Documents (admin).'
}

const TEMPLATE_BUILDERS: Record<string, (wb: ExcelJS.Workbook) => void> = {
  'ordre-reparation-template.xlsx': buildOrdreReparationTemplate,
  'suivi-template.xlsx': buildSuiviTemplate,
  'suivi-diag-template.xlsx': (wb) => buildDiagTemplate(wb, 'SUIVI DIAG — EL MECANO'),
  'suivi-diag-achat-template.xlsx': (wb) => buildDiagTemplate(wb, 'SUIVI DIAG ACHAT — EL MECANO'),
}

/** Crée le dossier templates, documents-cards.json et les .xlsx manquants. */
export async function ensureDocumentTemplates(): Promise<void> {
  if (!fs.existsSync(TEMPLATE_DIR)) {
    fs.mkdirSync(TEMPLATE_DIR, { recursive: true })
  }

  const cardsPath = path.join(TEMPLATE_DIR, 'documents-cards.json')
  if (!fs.existsSync(cardsPath)) {
    fs.writeFileSync(cardsPath, JSON.stringify(DEFAULT_CARDS, null, 2), 'utf-8')
  }

  for (const { fileName } of DEFAULT_CARDS) {
    const filePath = path.join(TEMPLATE_DIR, fileName)
    if (fs.existsSync(filePath)) continue
    const build = TEMPLATE_BUILDERS[fileName]
    if (!build) continue
    await writeWorkbook(filePath, build)
    console.log(`[templates] Created missing template: ${fileName}`)
  }
}
