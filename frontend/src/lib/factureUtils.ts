import type { Facture, LigneFacture } from '@/types'

export function computeFactureTotals(lignes: LigneFacture[], timbre: number) {
  const htMainOeuvre = lignes
    .filter((l): l is LigneFacture & { type: 'main_oeuvre' } => l.type === 'main_oeuvre')
    .reduce((s, l) => s + l.qte * l.mtHT, 0)
  const htProduits = lignes
    .filter((l): l is LigneFacture & { type: 'produit' } => l.type === 'produit')
    .reduce((s, l) => s + l.qte * l.prixUnitaireHT, 0)
  const totalHT = htMainOeuvre + htProduits
  const depenses = lignes
    .filter((l): l is LigneFacture & { type: 'depense' } => l.type === 'depense')
    .reduce((s, l) => s + l.montant, 0)
  const tva19 = totalHT * 0.19
  const totalTTC = totalHT + tva19 + depenses + timbre
  return { totalHT, tva19, depenses, totalTTC }
}

export function formatMontantEnLettres(n: number): string {
  const entiers = Math.floor(n)
  const dec = Math.round((n - entiers) * 1000) // millimes
  const un = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf']
  const dix = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix']
  if (entiers === 0 && dec === 0) return 'Zéro'
  const toFrench = (x: number): string => {
    if (x === 0) return ''
    if (x < 10) return un[x]
    if (x < 20) return ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'][x - 10]
    if (x < 100) {
      const d = Math.floor(x / 10)
      const u = x % 10
      if (d === 7) return 'soixante-' + toFrench(10 + u)
      if (d === 9) return 'quatre-vingt-' + toFrench(u)
      return dix[d] + (u ? '-' + un[u] : '')
    }
    if (x < 1000) {
      const c = Math.floor(x / 100)
      const rest = x % 100
      const part = c === 1 ? 'cent' : un[c] + ' cent'
      return rest ? part + ' ' + toFrench(rest) : part + 's'
    }
    if (x < 1000000) {
      const m = Math.floor(x / 1000)
      const rest = x % 1000
      const part = m === 1 ? 'mille' : toFrench(m) + ' mille'
      return rest ? part + ' ' + toFrench(rest) : part
    }
    return String(x)
  }
  const dinars = toFrench(entiers).replace(/^./, c => c.toUpperCase())
  const millimes = dec ? ` ${dec} millimes` : ''
  return `${dinars} Dinars${millimes}`
}

/** Génère le HTML d'une facture pour l'impression */
export function getFacturePrintHtml(facture: Facture): string {
  const { totalHT, tva19, depenses, totalTTC } = computeFactureTotals(facture.lignes, facture.timbre)
  const dateFormatted = new Date(facture.date + 'T12:00:00').toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const lignesMainOeuvre = facture.lignes.filter((l): l is LigneFacture & { type: 'main_oeuvre' } => l.type === 'main_oeuvre')
  const lignesProduits = facture.lignes.filter((l): l is LigneFacture & { type: 'produit' } => l.type === 'produit')
  const lignesDepenses = facture.lignes.filter((l): l is LigneFacture & { type: 'depense' } => l.type === 'depense')

  const rowsMain = lignesMainOeuvre
    .map(
      l =>
        `<tr><td>${l.qte}</td><td>${escapeHtml(l.designation)}</td><td></td><td class="text-right">${l.mtHT.toFixed(2)}</td><td class="text-right">${(l.qte * l.mtHT).toFixed(2)}</td></tr>`
    )
    .join('')
  const rowsProduits = lignesProduits
    .map(
      l =>
        `<tr><td>${l.qte}</td><td>${escapeHtml(l.designation)}</td><td></td><td class="text-right">${l.prixUnitaireHT.toFixed(2)}</td><td class="text-right">${(l.qte * l.prixUnitaireHT).toFixed(2)}</td></tr>`
    )
    .join('')
  const rowsDepenses = lignesDepenses
    .map(
      l =>
        `<tr><td colspan="2">${escapeHtml(l.designation)}</td><td></td><td></td><td class="text-right">${l.montant.toFixed(2)}</td></tr>`
    )
    .join('')

  function escapeHtml(s: string) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  const isAnnulee = facture.statut === 'annulee'

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${escapeHtml(facture.numero)}</title>
  <style>
    ${isAnnulee ? '.annulee-stamp { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 72px; font-weight: bold; color: rgba(239,68,68,0.4); z-index: 9999; pointer-events: none; }' : ''}
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111827; background: #e5e7eb; margin: 0; padding: 24px; }
    .invoice-wrapper { max-width: 900px; margin: 0 auto; }
    .invoice { background: #ffffff; border-radius: 12px; padding: 24px 28px 28px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12); }
    .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; border-bottom: 2px solid #059669; padding-bottom: 16px; margin-bottom: 20px; }
    .company-name { font-size: 18px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #059669; }
    .company-line { font-size: 11px; color: #6b7280; margin-top: 4px; }
    .invoice-title { font-size: 20px; font-weight: 700; text-align: right; color: #111827; letter-spacing: 0.08em; text-transform: uppercase; }
    .invoice-meta { margin-top: 6px; font-size: 11px; color: #4b5563; text-align: right; }
    .invoice-meta span.label { color: #6b7280; display: inline-block; min-width: 72px; }
    .section { margin-bottom: 18px; }
    .card { background: #f9fafb; border-radius: 10px; padding: 12px 14px; border: 1px solid #e5e7eb; }
    .card-title { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #6b7280; margin-bottom: 6px; }
    .client-name { font-size: 13px; font-weight: 600; color: #111827; }
    .client-line { font-size: 11px; color: #4b5563; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    thead th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; background: #f3f4f6; color: #6b7280; padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: left; }
    tbody td { font-size: 11px; padding: 7px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
    tbody tr.category-row td { background: #f9fafb; font-weight: 600; color: #4b5563; border-bottom-color: #e5e7eb; text-transform: uppercase; font-size: 10px; }
    .text-right { text-align: right; }
    .muted { color: #9ca3af; }
    .totaux-wrapper { margin-top: 16px; display: flex; justify-content: flex-end; }
    .totaux { width: 280px; border-collapse: collapse; font-size: 11px; }
    .totaux td { padding: 5px 0; }
    .totaux tr:not(:last-child) td { border-bottom: 1px solid #e5e7eb; }
    .totaux .label { color: #4b5563; }
    .totaux .value { text-align: right; font-variant-numeric: tabular-nums; }
    .totaux .total-ttc-row td { padding-top: 9px; border-bottom: none; }
    .totaux .total-ttc { font-size: 14px; font-weight: 700; color: #059669; }
    .montant-lettres { margin-top: 18px; padding: 10px 12px; background: #ecfdf5; border-radius: 10px; border: 1px solid #bbf7d0; font-style: italic; font-size: 11px; color: #166534; }
    .footer-note { margin-top: 16px; font-size: 10px; color: #9ca3af; text-align: right; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .invoice-wrapper { max-width: 100%; margin: 0; }
      .invoice { box-shadow: none; border-radius: 0; padding: 16px 24px 24px; }
    }
  </style>
</head>
<body>
  ${isAnnulee ? '<div class="annulee-stamp">ANNULÉE</div>' : ''}
  <div class="invoice-wrapper">
    <div class="invoice">
      <div class="invoice-header">
        <div>
          <div class="company-name">EL MECANO GARAGE</div>
          <div class="company-line">Matricule fiscale : 1864720/M</div>
        </div>
        <div style="text-align:right;">
          <div class="invoice-title">Facture</div>
          <div class="invoice-meta">
            <div><span class="label">N° facture :</span> ${escapeHtml(facture.numero)}</div>
            <div><span class="label">Date :</span> ${dateFormatted}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="card">
          <div class="card-title">Facturé à</div>
          <div class="client-name">${escapeHtml(facture.clientNom)}</div>
          ${facture.clientTelephone ? `<div class="client-line">Tél : ${escapeHtml(facture.clientTelephone)}</div>` : ''}
          ${facture.clientAdresse ? `<div class="client-line">Adresse : ${escapeHtml(facture.clientAdresse)}</div>` : ''}
          ${facture.clientMatriculeFiscale ? `<div class="client-line">Matricule fiscale : ${escapeHtml(facture.clientMatriculeFiscale)}</div>` : ''}
        </div>
      </div>

      <div class="section">
        <table>
          <thead>
            <tr>
              <th style="width:8%;">Qté</th>
              <th style="width:55%;">Désignation</th>
              <th style="width:15%;" class="text-right">P.U. HT</th>
              <th style="width:22%;" class="text-right">Total HT</th>
            </tr>
          </thead>
          <tbody>
            <tr class="category-row"><td colspan="4">Main d'œuvre</td></tr>
            ${
              rowsMain ||
              '<tr><td colspan="4" class="muted">Aucune ligne de main d\'œuvre</td></tr>'
            }
            ${
              rowsProduits
                ? `<tr class="category-row"><td colspan="4">Produits</td></tr>${rowsProduits}`
                : ''
            }
            ${
              rowsDepenses
                ? `<tr class="category-row"><td colspan="4">Dépenses</td></tr>${rowsDepenses}`
                : ''
            }
          </tbody>
        </table>
      </div>

      <div class="totaux-wrapper">
        <table class="totaux">
          <tr>
            <td class="label">Total HT</td>
            <td class="value">${totalHT.toFixed(2)} DT</td>
          </tr>
          <tr>
            <td class="label">TVA 19%</td>
            <td class="value">${tva19.toFixed(2)} DT</td>
          </tr>
          <tr>
            <td class="label">Dépenses</td>
            <td class="value">${depenses.toFixed(2)} DT</td>
          </tr>
          <tr>
            <td class="label">D. timbre</td>
            <td class="value">${facture.timbre.toFixed(2)} DT</td>
          </tr>
          <tr class="total-ttc-row">
            <td class="label total-ttc">Total TTC</td>
            <td class="value total-ttc">${totalTTC.toFixed(2)} DT</td>
          </tr>
        </table>
      </div>

      <div class="montant-lettres">
        Arrêtée la présente facture à la somme de : <strong>${formatMontantEnLettres(totalTTC)}</strong>
      </div>

      <div class="footer-note">
        Merci pour votre confiance.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/** Ouvre une fenêtre d'impression pour la facture */
export function printFacture(facture: Facture): void {
  const html = getFacturePrintHtml(facture)
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
    win.close()
  }, 300)
}

/** Génère le HTML d'une facture pour l'export PDF (fragment avec styles inline) */
function getFacturePdfHtml(facture: Facture): string {
  const full = getFacturePrintHtml(facture)
  const styleMatch = full.match(/<style>([\s\S]*?)<\/style>/)
  const bodyMatch = full.match(/<body[^>]*>([\s\S]*?)<\/body>/)
  const styles = styleMatch ? styleMatch[1] : ''
  const bodyContent = bodyMatch ? bodyMatch[1] : full
  return `<div style="font-family: Arial, sans-serif; font-size: 12px; color: #1f2937; max-width: 800px; margin: 0 auto; padding: 24px;"><style>${styles}</style>${bodyContent}</div>`
}

/** Exporte la facture en PDF et déclenche le téléchargement */
export async function exportFacturePdf(facture: Facture): Promise<void> {
  const [html2canvas, jspdfModule] = await Promise.all([import('html2canvas'), import('jspdf')])
  const jsPDF = jspdfModule.default

  // On utilise une iframe isolée pour éviter les couleurs Tailwind en oklch
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.left = '0'
  iframe.style.top = '0'
  iframe.style.width = '800px'
  iframe.style.height = '1123px'
  iframe.style.opacity = '0'
  iframe.style.pointerEvents = 'none'
  iframe.style.zIndex = '-1'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  if (!doc) {
    document.body.removeChild(iframe)
    throw new Error('Impossible de créer le document PDF')
  }

  doc.open()
  doc.write(getFacturePrintHtml(facture))
  doc.close()

  const body = doc.body

  await new Promise<void>(resolve => {
    // Laisser le temps au navigateur de peindre l'iframe
    setTimeout(() => resolve(), 200)
  })

  try {
    const canvas = await html2canvas.default(body, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 800,
    })

    const imgData = canvas.toDataURL('image/jpeg', 0.98)
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
    const pdfW = pdf.internal.pageSize.getWidth()
    const pdfH = pdf.internal.pageSize.getHeight()
    const imgW = canvas.width
    const imgH = canvas.height
    const ratio = Math.min((pdfW - 20) / imgW, (pdfH - 20) / imgH) * 0.95
    const w = imgW * ratio
    const h = imgH * ratio
    const x = (pdfW - w) / 2
    const y = 10
    pdf.addImage(imgData, 'JPEG', x, y, w, h)
    pdf.save(`Facture-${facture.numero.replace(/\//g, '-')}.pdf`)
  } finally {
    document.body.removeChild(iframe)
  }
}
