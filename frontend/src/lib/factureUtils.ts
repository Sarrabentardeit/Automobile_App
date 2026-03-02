import type { Facture, LigneFacture } from '@/types'

export function computeFactureTotals(lignes: LigneFacture[], timbre: number) {
  const totalHT = lignes
    .filter((l): l is LigneFacture & { type: 'main_oeuvre' } => l.type === 'main_oeuvre')
    .reduce((s, l) => s + l.qte * l.mtHT, 0)
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
  const lignesDepenses = facture.lignes.filter((l): l is LigneFacture & { type: 'depense' } => l.type === 'depense')

  const rowsMain = lignesMainOeuvre
    .map(
      l =>
        `<tr><td>${l.qte}</td><td>${escapeHtml(l.designation)}</td><td></td><td class="text-right">${l.mtHT.toFixed(2)}</td><td class="text-right">${(l.qte * l.mtHT).toFixed(2)}</td></tr>`
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
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1f2937; max-width: 800px; margin: 0 auto; padding: 24px; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #059669; padding-bottom: 16px; }
    .header h1 { margin: 0; font-size: 22px; color: #059669; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 16px; }
    .meta div { flex: 1; min-width: 200px; }
    .client { background: #f9fafb; padding: 12px; border-radius: 8px; margin-bottom: 20px; }
    .client h3 { margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; }
    th { background: #f3f4f6; font-weight: 600; font-size: 11px; }
    .text-right { text-align: right; }
    .totaux { margin-left: auto; width: 280px; margin-top: 16px; }
    .totaux tr { border: none; }
    .totaux td { border: none; border-bottom: 1px solid #e5e7eb; padding: 6px 0; }
    .totaux .total-ttc { font-weight: bold; font-size: 14px; border-bottom: none; padding-top: 10px; }
    .montant-lettres { margin-top: 20px; padding: 12px; background: #f0fdf4; border-radius: 8px; font-style: italic; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  ${isAnnulee ? '<div class="annulee-stamp">ANNULÉE</div>' : ''}
  <div class="header">
    <h1>FACTURE</h1>
  </div>
  <div class="meta">
    <div>
      <strong>Facture N°:</strong> ${escapeHtml(facture.numero)}<br>
      <strong>Date:</strong> ${dateFormatted}
    </div>
  </div>
  <div class="client">
    <h3>Facturé à</h3>
    <p style="margin: 0;"><strong>${escapeHtml(facture.clientNom)}</strong></p>
    ${facture.clientTelephone ? `<p style="margin: 4px 0 0 0;">Tél: ${escapeHtml(facture.clientTelephone)}</p>` : ''}
    ${facture.clientAdresse ? `<p style="margin: 4px 0 0 0;">Adresse: ${escapeHtml(facture.clientAdresse)}</p>` : ''}
    ${facture.clientMatriculeFiscale ? `<p style="margin: 4px 0 0 0;">Matricule fiscale: ${escapeHtml(facture.clientMatriculeFiscale)}</p>` : ''}
  </div>
  <table>
    <thead>
      <tr><th>Qté</th><th>Désignation</th><th></th><th class="text-right">MT HT</th><th class="text-right">Total HT</th></tr>
    </thead>
    <tbody>
      <tr><td colspan="5" style="font-weight: 600; background: #f9fafb;">MAIN D'ŒUVRE</td></tr>
      ${rowsMain || '<tr><td colspan="5" style="color: #9ca3af;">—</td></tr>'}
      ${rowsDepenses ? `<tr><td colspan="5" style="font-weight: 600; background: #f9fafb;">DEPENSES</td></tr>${rowsDepenses}` : ''}
    </tbody>
  </table>
  <table class="totaux">
    <tr><td>TOTAL HT</td><td class="text-right">${totalHT.toFixed(2)} DT</td></tr>
    <tr><td>TVA 19%</td><td class="text-right">${tva19.toFixed(2)} DT</td></tr>
    <tr><td>DEPENSES</td><td class="text-right">${depenses.toFixed(2)} DT</td></tr>
    <tr><td>D. TIMBRE</td><td class="text-right">${facture.timbre.toFixed(2)} DT</td></tr>
    <tr><td class="total-ttc">TOTAL TTC</td><td class="text-right total-ttc">${totalTTC.toFixed(2)} DT</td></tr>
  </table>
  <div class="montant-lettres">
    Arrêtée la présente facture à la somme de : <strong>${formatMontantEnLettres(totalTTC)}</strong>
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
