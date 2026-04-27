import type { OrdreReparation } from '@/types'

export const GARAGE_NAME_ORDRE = 'EL MECANO GARAGE'

/** Libellés alignés sur la feuille Excel « Ordre de réparation » */
export const ORDRE_EXCEL_TITRE_EN = 'R E P A I R W O R K O R D E R'
/** Comme sur la feuille Excel (orthographe « DEMANDES ») */
export const ORDRE_EXCEL_TRAVAUX_DEMANDEES = 'TRAVAUX DEMANDES'
export const ORDRE_EXCEL_TRAVAUX_PROCHAINS = ' TRAVAUX PROCHAINS'
export const ORDRE_EXCEL_QUANTITE = 'QUANTITE'
export const ORDRE_EXCEL_PRODUITS_PIECES = 'PRODUITS / PIECES'

/** Même feuille Excel : schéma image à la place du dessin vectoriel. */
export const ORDRE_SCHEMA_VEHICULE_PATH = '/ordre-reparation-schema-voiture.jpg'

/** 8 cases (2×4) alignées sur la grille voyants de la feuille atelier. */
export const VOYANT_DEFS = [
  { key: 'moteur',       label: 'Moteur / diagnostic', src: '/voyant-moteur.png' },
  { key: 'airbag',       label: 'Airbag',              src: '/voyant-airbag.png' },
  { key: 'abs',          label: 'ABS',                 src: '/voyant-abs.png' },
  { key: 'carburant',    label: 'Carburant',            src: '/voyant-carburant.png' },
  { key: 'prechauffage', label: 'Préchauffage',         src: '/voyant-prechauffage.png' },
  { key: 'pression',     label: 'Pression pneu',        src: '/voyant-pression.png' },
  { key: 'batterie',     label: 'Batterie',             src: '/voyant-batterie.png' },
  { key: 'huile',        label: "Huile",                src: '/voyant-huile.png' },
] as const

/**
 * Schéma atelier (même visuel que la feuille Excel) — image dans `public/ordre-reparation-schema-voiture.jpg`.
 * Le nom `CarTopViewSvg` est conservé pour ne pas casser les imports.
 */
export function CarTopViewSvg({ className = '' }: { className?: string }) {
  return (
    <img
      src={ORDRE_SCHEMA_VEHICULE_PATH}
      alt="Schéma véhicule — élévation et vues (état des lieux carrosserie)"
      className={`block mx-auto w-full h-auto object-contain max-h-[min(52vh,380px)] ${className}`}
    />
  )
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function statutLabel(s: string) {
  if (s === 'fait') return 'Fait'
  if (s === 'na') return 'N/A'
  return 'À faire'
}

function voyantCell(v: Record<string, string>, k: string) {
  return v[k] ?? ''
}

type ComplementLecture = {
  travauxProchains: string
  pieces: Array<{ quantite: string; produit: string }>
  prix: string
  technicienMention: string
  signatureControle: string
  note: string
}

function readComplement(ord: OrdreReparation): ComplementLecture {
  const d = (ord.complementJson ?? {}) as Record<string, unknown>
  const raw = d.pieces
  const pieceRows: Array<{ quantite: string; produit: string }> = []
  if (Array.isArray(raw)) {
    for (const p of raw) {
      if (typeof p !== 'object' || p === null) continue
      const q = (p as { quantite?: unknown; produit?: unknown }).quantite
      const r = (p as { produit?: unknown }).produit
      pieceRows.push({
        quantite: q != null ? String(q) : '',
        produit: r != null ? String(r) : '',
      })
    }
  }
  while (pieceRows.length < 10) pieceRows.push({ quantite: '', produit: '' })
  return {
    travauxProchains: typeof d.travauxProchains === 'string' ? d.travauxProchains : '',
    pieces: pieceRows,
    prix: typeof d.prix === 'string' ? d.prix : '',
    technicienMention: typeof d.technicienMention === 'string' ? d.technicienMention : '',
    signatureControle: typeof d.signatureControle === 'string' ? d.signatureControle : '',
    note: typeof d.note === 'string' ? d.note : '',
  }
}

/** HTML imprimable — réplique exacte de la feuille Excel */
export function buildOrdreReparationDocumentHtml(ord: OrdreReparation): string {
  const comp = readComplement(ord)
  const v = (ord.voyantsJson as Record<string, string>) ?? {}

  const lines = ord.lignes
    .slice()
    .sort((a, b) => a.ordre - b.ordre || (a.id ?? 0) - (b.id ?? 0))

  const TRAVAUX_TOTAL = 20
  const PIECES_TOTAL = 10
  const emptyTravaux = Math.max(0, TRAVAUX_TOTAL - lines.length)

  const rowsHtml = lines
    .map(l => `<tr>
  <td style="border:1px solid #000;padding:2px 5px;font-size:8pt">${escapeHtml(l.description) || '&nbsp;'}</td>
  <td style="border:1px solid #000;padding:2px 4px;text-align:center;font-size:8pt;width:22%">${escapeHtml(statutLabel(l.statut))}</td>
</tr>`).join('')

  const emptyTravauxHtml = Array.from({ length: emptyTravaux })
    .map(() => `<tr>
  <td style="border:1px solid #000;padding:5px">&nbsp;</td>
  <td style="border:1px solid #000;padding:5px">&nbsp;</td>
</tr>`).join('')

  const pieceLines = [...comp.pieces]
  while (pieceLines.length < PIECES_TOTAL) pieceLines.push({ quantite: '', produit: '' })
  const pieceRowsHtml = pieceLines.slice(0, PIECES_TOTAL)
    .map(p => `<tr>
  <td style="border:1px solid #000;padding:2px 4px;font-size:8pt;text-align:center;width:22%">${escapeHtml(p.quantite) || '&nbsp;'}</td>
  <td style="border:1px solid #000;padding:2px 4px;font-size:8pt">${escapeHtml(p.produit) || '&nbsp;'}</td>
</tr>`).join('')

  const origin = typeof globalThis !== 'undefined' && 'location' in globalThis
    ? (globalThis as unknown as { location: { origin: string } }).location.origin
    : ''
  const schemaUrl = `${origin}${ORDRE_SCHEMA_VEHICULE_PATH}`

  const voyGridRows: string[] = []
  for (let i = 0; i < VOYANT_DEFS.length; i += 2) {
    const a = VOYANT_DEFS[i]
    const b = VOYANT_DEFS[i + 1]
    const cell = (d: typeof VOYANT_DEFS[number]) =>
      `<td style="border:1px solid #000;padding:3px 5px;vertical-align:middle;width:50%">
  <div style="display:flex;align-items:center;gap:5px">
    <img src="${origin}${escapeHtml(d.src)}" style="width:20px;height:20px;object-fit:contain;flex-shrink:0" alt="${escapeHtml(d.label)}"/>
    <span style="font-size:8pt">${escapeHtml(voyantCell(v, d.key)) || '&nbsp;'}</span>
  </div>
</td>`
    voyGridRows.push(`<tr>${cell(a)}${b ? cell(b) : '<td style="border:1px solid #000">&nbsp;</td>'}</tr>`)
  }

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<title>Ordre de réparation ${escapeHtml(ord.numero || `OR-${ord.id}`)}</title>
<style>
  @page { size: A4 portrait; margin: 8mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 8.5pt; color: #000; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 100%; border: 1.5px solid #000; }
  table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  td, th { border: 1px solid #000; }
  .lbl { background: #e8e8e8; font-weight: bold; font-size: 7.5pt; text-transform: uppercase; padding: 2px 4px; white-space: nowrap; }
  .val { padding: 2px 4px; font-size: 8.5pt; }
  .th { background: #d9d9d9; font-weight: bold; font-size: 7.5pt; text-transform: uppercase; text-align: center; padding: 2px 4px; }
  .sec { background: #e8e8e8; font-weight: bold; font-size: 7.5pt; text-transform: uppercase; text-align: center; padding: 2px 4px; }
</style>
</head>
<body>
<div class="page">

  <!-- ═══ ENTÊTE ═══ -->
  <div style="padding:4px 6px 0">
    <div style="font-size:15pt;font-weight:900;line-height:1.1">ORDRE DE RÉPARATION</div>
    <div style="font-size:9pt;font-weight:700;margin-bottom:2px">${escapeHtml(GARAGE_NAME_ORDRE)}</div>
  </div>
  <div style="text-align:center;font-size:7pt;letter-spacing:.25em;border-top:1px solid #000;border-bottom:1px solid #000;padding:2px 0;color:#333">
    R E P A I R W O R K O R D E R
  </div>

  <!-- ═══ CHAMPS VÉHICULE / CLIENT (ordre Excel : NOM en premier, DATE en dernier) ═══ -->
  <table style="border:none;border-top:0">
    <colgroup><col style="width:18%"><col style="width:32%"><col style="width:18%"><col style="width:32%"></colgroup>
    <tr>
      <td class="lbl" style="border-top:none;border-left:none">NOM DU CLIENT</td>
      <td class="val" style="border-top:none">${escapeHtml(ord.clientNom) || '&nbsp;'}</td>
      <td class="lbl" style="border-top:none">TÉLÉPHONE CLIENT</td>
      <td class="val" style="border-top:none;border-right:none">${escapeHtml(ord.clientTelephone) || '&nbsp;'}</td>
    </tr>
    <tr>
      <td class="lbl" style="border-left:none">VOITURE</td>
      <td class="val">${escapeHtml(ord.voiture) || '&nbsp;'}</td>
      <td class="lbl">IMMATRICULATION</td>
      <td class="val" style="border-right:none;font-weight:bold;font-family:monospace">${escapeHtml(ord.immatriculation) || '&nbsp;'}</td>
    </tr>
    <tr>
      <td class="lbl" style="border-left:none">KILOMETRAGE</td>
      <td class="val">${ord.kilometrage != null ? String(ord.kilometrage) : '&nbsp;'}</td>
      <td class="lbl">TECHNICIEN</td>
      <td class="val" style="border-right:none">${escapeHtml(ord.technicien) || '&nbsp;'}</td>
    </tr>
    <tr>
      <td class="lbl" style="border-left:none;border-bottom:none">DATE D'ENTRÉE</td>
      <td class="val" style="border-bottom:none">${escapeHtml(ord.dateEntree || '') || '&nbsp;'}</td>
      <td class="lbl" style="border-bottom:none">VIN NUMBER</td>
      <td class="val" style="border-right:none;border-bottom:none;font-family:monospace">${escapeHtml(ord.vin) || '&nbsp;'}</td>
    </tr>
  </table>

  <!-- ═══ CORPS PRINCIPAL : 2 colonnes ═══ -->
  <table style="border:1px solid #000;border-top:1px solid #000">
    <colgroup><col style="width:52%"><col style="width:48%"></colgroup>
    <tr style="vertical-align:top">

      <!-- ── COLONNE GAUCHE ── -->
      <td style="padding:0;border-right:1px solid #000;border-left:none;border-bottom:none">

        <!-- Travaux demandées -->
        <table style="border:none">
          <tr>
            <th class="th" style="width:78%;border-left:none;border-top:none">TRAVAUX DEMANDEES</th>
            <th class="th" style="width:22%;border-top:none;border-right:none">STATUT</th>
          </tr>
          ${rowsHtml}
          ${emptyTravauxHtml}
        </table>

        <!-- Quantité / Produits / Pièces -->
        <table style="border:none;border-top:1px solid #000">
          <tr>
            <th class="th" style="width:22%;border-left:none;border-top:none">QUANTITE</th>
            <th class="th" style="width:78%;border-top:none;border-right:none">PRODUITS / PIECES</th>
          </tr>
          ${pieceRowsHtml}
        </table>
      </td>

      <!-- ── COLONNE DROITE ── -->
      <td style="padding:0;border-right:none;border-bottom:none;vertical-align:top">

        <!-- AV.G / AV.D -->
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:8pt;padding:2px 6px;border-bottom:1px solid #000">
          <span>AV. G</span><span>AV. D</span>
        </div>

        <!-- Schéma voiture -->
        <div style="text-align:center;border-bottom:1px solid #000;padding:2px">
          <img src="${escapeHtml(schemaUrl)}" style="max-width:100%;max-height:190px;height:auto;object-fit:contain" alt="schéma"/>
        </div>

        <!-- Voyants 4×2 -->
        <table style="border:none">
          ${voyGridRows.join('')}
        </table>

        <!-- Travaux prochains -->
        <div class="sec" style="border-top:1px solid #000;border-bottom:1px solid #000">TRAVAUX PROCHAINS</div>
        <div style="min-height:60px;padding:4px 5px;font-size:8.5pt;border-bottom:1px solid #000;white-space:pre-wrap">${escapeHtml(comp.travauxProchains) || '&nbsp;'}</div>

        <!-- Prix / Technicien -->
        <table style="border:none;border-top:0">
          <tr>
            <td class="lbl" style="width:30%;border-left:none;border-top:none">PRIX :</td>
            <td class="val" style="border-top:none;border-right:none">${escapeHtml(comp.prix) || '&nbsp;'}</td>
          </tr>
          <tr>
            <td class="lbl" style="border-left:none;border-bottom:none">TECHNICIEN :</td>
            <td class="val" style="border-bottom:none;border-right:none">${escapeHtml(comp.technicienMention) || '&nbsp;'}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- ═══ SIGNATURE ═══ -->
  <div style="display:flex;border-top:0;align-items:stretch">
    <div class="lbl" style="border:1px solid #000;border-top:0;padding:3px 6px;white-space:nowrap;display:flex;align-items:center">SIGNATURE CONTRÔLE QUALITÉ OU GÉRANT :</div>
    <div style="flex:1;border:1px solid #000;border-top:0;border-left:0;min-height:26px;padding:2px 5px;font-size:8.5pt">${escapeHtml(comp.signatureControle) || '&nbsp;'}</div>
  </div>

  <!-- ═══ NOTE ═══ -->
  <div style="border:1px solid #000;border-top:0">
    <div class="sec" style="border-bottom:1px solid #ccc">NOTE :</div>
    <div style="min-height:60px;padding:4px 5px;font-size:8.5pt;white-space:pre-wrap">${escapeHtml(comp.note) || '&nbsp;'}</div>
  </div>

  <!-- ═══ FICHE REMPLIE PAR ═══ -->
  <div style="display:flex;border-top:0">
    <div class="lbl" style="border:1px solid #000;border-top:0;padding:3px 6px;white-space:nowrap;display:flex;align-items:center">FICHE REMPLIE PAR</div>
    <div style="flex:1;border:1px solid #000;border-top:0;border-left:0;padding:3px 5px;font-size:8.5pt">${escapeHtml(ord.rempliPar) || '&nbsp;'}</div>
  </div>

</div>
</body></html>`
}
