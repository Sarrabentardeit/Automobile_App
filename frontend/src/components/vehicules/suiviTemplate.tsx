import type { VehiculeSuivi } from '../../types'

/**
 * Génère le HTML d'impression de la fiche Suivi.
 * Layout calqué sur Facture-suivi.xlsx :
 *   - Titre "SUIVI" centré (fond vert clair #D7E4BD, taille 36)
 *   - Ligne Date/Voiture, Kilométrage/Matricule (fond #D7E4BD)
 *   - 3 colonnes : Travaux Effectuées | Travaux Prochains | Produits Utilisés (fond entête #B9CDE5)
 *     12 lignes de données (rows 7-18)
 *   - Pied : TECHNICIEN (fond #C6D9F1)
 */
export function buildSuiviDocumentHtml(suivi: VehiculeSuivi): string {
  const travEff   = (suivi.travauxEffectues  ?? '').split('\n')
  const travProch = (suivi.travauxProchains  ?? '').split('\n')
  const produits  = (suivi.produitsUtilises  ?? '').split('\n')
  const ROWS = 12
  const maxRows = Math.max(ROWS, travEff.length, travProch.length, produits.length)

  const dataRows = Array.from({ length: maxRows }, (_, i) => `
    <tr>
      <td class="data-l">${esc(travEff[i]  ?? '')}</td>
      <td class="data-m">${esc(travProch[i] ?? '')}</td>
      <td class="data-r">${esc(produits[i]  ?? '')}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Suivi – ${esc(suivi.numero)}</title>
  <style>
    @page { size: A4 portrait; margin: 14mm 12mm; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #111; background: #fff; }

    /* ── titre ── */
    .title-row { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    .title-cell {
      text-align: center; font-size: 36pt; font-weight: 400; letter-spacing: 2px;
      background: #D7E4BD; border: 1px solid #888;
      padding: 8px 0 4px;
    }
    .numero { text-align: center; font-size: 9pt; color: #555; margin-bottom: 6px; }

    /* ── info header ── */
    table.info { width: 100%; border-collapse: collapse; margin-bottom: 0; }
    .lbl  { background: #D7E4BD; border: 1px solid #888; font-weight: bold;
            font-size: 11pt; padding: 4px 8px; white-space: nowrap; width: 120px; }
    .val  { border: 1px solid #888; font-size: 11pt; padding: 4px 8px; }

    /* ── gap row ── */
    .gap  { height: 6px; }

    /* ── 3-col table ── */
    table.main { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .th-l { width: 41%; background: #B9CDE5; border: 1px solid #888; font-weight: bold;
             font-size: 11pt; padding: 5px 8px; text-align: center; }
    .th-m { width: 36%; background: #B9CDE5; border: 1px solid #888; font-weight: bold;
             font-size: 11pt; padding: 5px 8px; text-align: center; }
    .th-r { width: 23%; background: #B9CDE5; border: 1px solid #888; font-weight: bold;
             font-size: 11pt; padding: 5px 8px; text-align: center; }
    .data-l { border: 1px solid #888; font-size: 11pt; padding: 3px 8px; height: 22px; vertical-align: middle; }
    .data-m { border: 1px solid #888; font-size: 11pt; padding: 3px 8px; height: 22px; vertical-align: middle; }
    .data-r { border: 1px solid #888; font-size: 11pt; padding: 3px 8px; height: 22px; vertical-align: middle; }

    /* ── pied ── */
    .footer { width: 100%; border-collapse: collapse; margin-top: 4px; }
    .tech-cell {
      background: #C6D9F1; border: 2px solid #888;
      font-size: 14pt; padding: 6px 12px; width: 60%;
    }
    .rempli-lbl { font-weight: bold; font-size: 11pt; padding: 4px 8px; background: #D7E4BD;
                  border: 1px solid #888; white-space: nowrap; }
    .rempli-val { font-size: 11pt; padding: 4px 8px; border: 1px solid #888; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  <!-- TITRE -->
  <table class="title-row">
    <tr><td class="title-cell">SUIVI</td></tr>
  </table>
  <div class="numero">${esc(suivi.numero ?? '')}</div>

  <!-- INFO -->
  <table class="info">
    <tr>
      <td class="lbl">Date :</td>
      <td class="val">${esc(suivi.date ?? '')}</td>
      <td class="lbl">Voiture :</td>
      <td class="val">${esc(suivi.voiture ?? '')}</td>
    </tr>
    <tr>
      <td class="lbl">Kilométrage :</td>
      <td class="val">${esc(suivi.kilometrage ?? '')}</td>
      <td class="lbl">Matricule :</td>
      <td class="val">${esc(suivi.matricule ?? '')}</td>
    </tr>
  </table>

  <div class="gap"></div>

  <!-- 3-COL TABLE -->
  <table class="main">
    <thead>
      <tr>
        <th class="th-l">TRAVAUX EFFECTUÉES</th>
        <th class="th-m">TRAVAUX PROCHAINS</th>
        <th class="th-r">PRODUITS UTILISÉS</th>
      </tr>
    </thead>
    <tbody>
      ${dataRows}
    </tbody>
  </table>

  <!-- PIED -->
  <table class="footer">
    <tr>
      <td class="tech-cell">TECHNICIEN :&nbsp;&nbsp;${esc(suivi.technicien ?? '')}</td>
      <td class="rempli-lbl">Fiche remplie par :</td>
      <td class="rempli-val">${esc(suivi.rempliPar ?? '')}</td>
    </tr>
  </table>

</body>
</html>`
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')
}
