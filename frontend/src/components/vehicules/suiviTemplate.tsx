import type { VehiculeSuivi, VehiculeSuiviInput } from '../../types'

/** Données minimales pour générer la fiche / PDF */
export type SuiviDocData = Pick<
  VehiculeSuivi,
  | 'numero'
  | 'date'
  | 'voiture'
  | 'matricule'
  | 'kilometrage'
  | 'travauxEffectues'
  | 'travauxProchains'
  | 'produitsUtilises'
  | 'technicien'
  | 'rempliPar'
> & { numero?: string }

export function suiviFromForm(
  form: VehiculeSuiviInput,
  numero?: string
): SuiviDocData {
  return {
    numero: numero ?? '',
    date: form.date ?? '',
    voiture: form.voiture ?? '',
    matricule: form.matricule ?? '',
    kilometrage: form.kilometrage ?? '',
    travauxEffectues: form.travauxEffectues ?? '',
    travauxProchains: form.travauxProchains ?? '',
    produitsUtilises: form.produitsUtilises ?? '',
    technicien: form.technicien ?? '',
    rempliPar: form.rempliPar ?? '',
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function nonEmptyLines(value: string | undefined): string[] {
  return (value ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

function formatDateFr(iso: string): string {
  const raw = (iso || '').trim()
  if (!raw) return ''
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return raw
}

function formatKm(km: string): string {
  const t = (km || '').trim()
  if (!t) return ''
  if (/km/i.test(t)) return t
  return `${t} km`
}

function listItemsHtml(lines: string[]): string {
  if (lines.length === 0) {
    return `<div class="item item-empty"><span class="bullet">■</span><span class="txt">&nbsp;</span></div>`
  }
  return lines
    .map(
      (l) =>
        `<div class="item"><span class="bullet">■</span><span class="txt">${esc(l)}</span></div>`
    )
    .join('')
}

/**
 * Template « affiche » calqué sur DOC/affiche_suivi_entretien.pdf
 * Page blanche + bordure rouge (pas fond rouge plein).
 */
export function buildSuiviAfficheHtml(suivi: SuiviDocData): string {
  const travEff = nonEmptyLines(suivi.travauxEffectues)
  const travProch = nonEmptyLines(suivi.travauxProchains)
  const produits = nonEmptyLines(suivi.produitsUtilises)
  const numero = (suivi.numero || '').trim() || '—'
  const date = formatDateFr(suivi.date ?? '')
  const voiture = (suivi.voiture || '').trim() || '—'
  const matricule = (suivi.matricule || '').trim() || '—'
  const km = formatKm(suivi.kilometrage ?? '') || '—'
  const tech = (suivi.technicien || '').trim() || '—'
  const rempli = (suivi.rempliPar || '').trim() || '—'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Fiche suivi – ${esc(numero)}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 810px;
      height: 1012px;
      margin: 0;
      padding: 0;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #1a1a1a;
      padding: 0;
      margin: 0;
      background: #ffffff;
      overflow: hidden;
    }
    /* Bordure rouge collée aux extrémités de la page */
    .sheet {
      background: #ffffff;
      border: 14px solid #C62828;
      width: 810px;
      height: 1012px;
      min-height: 1012px;
      padding: 24px 26px 18px;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }
    .banner {
      background: #C62828;
      color: #fff;
      text-align: center;
      padding: 22px 16px 18px;
      border-radius: 4px;
    }
    .banner h1 {
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 0.5px;
      line-height: 1.05;
      text-transform: uppercase;
    }
    .banner h2 {
      font-size: 16px;
      font-weight: 400;
      margin-top: 8px;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }
    .meta {
      margin-top: 18px;
      background: #FFEBEE;
      border-left: 7px solid #C62828;
      display: flex;
      gap: 8px;
      padding: 14px 16px 12px 18px;
    }
    .meta .col { flex: 1; min-width: 0; }
    .meta .lbl {
      font-size: 10px;
      font-weight: 700;
      color: #C62828;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      margin-bottom: 5px;
    }
    .meta .val {
      font-size: 15px;
      font-weight: 800;
      color: #1a1a1a;
      word-break: break-word;
      line-height: 1.2;
    }
    .cols {
      margin-top: 18px;
      display: flex;
      gap: 16px;
      align-items: stretch;
      flex: 1;
    }
    .panel {
      flex: 1;
      background: #ffffff;
      border: 1px solid #E0E0E0;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      min-height: 480px;
      overflow: hidden;
    }
    .panel-inner {
      padding: 16px 14px 12px;
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #ffffff;
    }
    .sec-title {
      display: block;
      width: 100%;
      background: transparent;
      color: #C62828;
      font-size: 15px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 0 0 8px;
      margin: 0 0 10px;
      letter-spacing: 0.3px;
      border-bottom: 2px solid #C62828;
    }
    .list {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      background: #ffffff;
    }
    .item {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      background: #ffffff;
      padding: 6px 4px;
      font-size: 12px;
      line-height: 1.4;
    }
    .item-empty .txt,
    .item-empty .bullet { color: transparent; }
    .bullet {
      color: #C62828;
      font-size: 9px;
      line-height: 1.5;
      flex-shrink: 0;
    }
    .txt { color: #333333; flex: 1; }
    .right-stack {
      display: flex;
      flex-direction: column;
      flex: 1;
      height: 100%;
      gap: 16px;
    }
    .block { flex: 0 0 auto; }
    .block-grow { flex: 1; display: flex; flex-direction: column; min-height: 0; }
    .block-grow .list { flex: 1; }
    .meta-foot {
      margin-top: auto;
      background: #ffffff;
      padding: 12px 2px 2px;
      font-size: 12px;
      font-weight: 700;
      color: #555555;
      line-height: 1.5;
      border-top: 1px solid #E0E0E0;
    }
    .page-foot {
      margin-top: 20px;
      padding-top: 14px;
      border-top: 1px solid #E8E8E8;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      background: #ffffff;
    }
    .foot-left { flex: 1; min-width: 0; }
    .tagline { font-size: 13px; color: #555555; margin-bottom: 6px; }
    .contact {
      font-size: 12px;
      color: #C62828;
      font-weight: 700;
      line-height: 1.45;
    }
    .contact span { color: #555555; font-weight: 600; }
    .handle {
      background: #C62828;
      color: #fff;
      font-weight: 800;
      font-size: 13px;
      padding: 9px 18px;
      border-radius: 999px;
      white-space: nowrap;
      flex-shrink: 0;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="banner">
      <h1>EL MECANO GARAGE</h1>
      <h2>FICHE DE SUIVI ET ENTRETIEN</h2>
    </div>

    <div class="meta">
      <div class="col">
        <div class="lbl">N° DE FICHE</div>
        <div class="val">${esc(numero)}</div>
      </div>
      <div class="col">
        <div class="lbl">DATE</div>
        <div class="val">${esc(date || '—')}</div>
      </div>
      <div class="col">
        <div class="lbl">VÉHICULE</div>
        <div class="val">${esc(voiture)}</div>
      </div>
      <div class="col">
        <div class="lbl">MATRICULE</div>
        <div class="val">${esc(matricule)}</div>
      </div>
      <div class="col">
        <div class="lbl">KILOMÉTRAGE</div>
        <div class="val">${esc(km)}</div>
      </div>
    </div>

    <div class="cols">
      <div class="panel">
        <div class="panel-inner">
          <div class="sec-title">Travaux effectués</div>
          <div class="list">${listItemsHtml(travEff)}</div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-inner right-stack">
          <div class="block">
            <div class="sec-title">Travaux prochains</div>
            <div class="list">${listItemsHtml(travProch)}</div>
          </div>
          <div class="block-grow">
            <div class="sec-title">Produits utilisés</div>
            <div class="list">${listItemsHtml(produits)}</div>
          </div>
          <div class="meta-foot">
            Techniciens : ${esc(tech)}<br/>
            Fiche remplie par : ${esc(rempli)}
          </div>
        </div>
      </div>
    </div>

    <div class="page-foot">
      <div class="foot-left">
        <div class="tagline">Service de qualité et pièces d'origine garanties.</div>
        <div class="contact">
          <span>Tél.</span> 52 351 490 / 58 084 001
          &nbsp;&nbsp;·&nbsp;&nbsp;
          <span>Email</span> autoservicerad@gmail.com
        </div>
      </div>
      <div class="handle">@EL_MECANO_GARAGE</div>
    </div>
  </div>
</body>
</html>`
}

/**
 * Ancien layout Excel (impression 3 colonnes) — conservé pour compatibilité.
 */
export function buildSuiviDocumentHtml(suivi: VehiculeSuivi | SuiviDocData): string {
  return buildSuiviAfficheHtml(suivi)
}

/** Exporte la fiche suivi en PDF (template affiche). */
export async function exportSuiviPdf(suivi: SuiviDocData): Promise<void> {
  const [html2canvas, jspdfModule] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])
  const jsPDF = jspdfModule.default

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.left = '0'
  iframe.style.top = '0'
  iframe.style.width = '810px'
  iframe.style.height = '1012px'
  iframe.style.border = '0'
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
  doc.write(buildSuiviAfficheHtml(suivi))
  doc.close()

  await new Promise<void>((resolve) => setTimeout(resolve, 250))

  try {
    const target = doc.querySelector('.sheet') as HTMLElement | null
    const canvas = await html2canvas.default(target ?? doc.body, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#C62828',
      width: 810,
      height: 1012,
      windowWidth: 810,
      windowHeight: 1012,
    })

    const imgData = canvas.toDataURL('image/jpeg', 0.98)
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
    const pdfW = pdf.internal.pageSize.getWidth()
    const pdfH = pdf.internal.pageSize.getHeight()
    // Remplir toute la page A4 — bordure rouge aux extrémités
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH)

    const safe = (suivi.numero || 'suivi').replace(/[/\\?%*:|"<>]/g, '-')
    pdf.save(`Fiche-suivi-${safe}.pdf`)
  } finally {
    document.body.removeChild(iframe)
  }
}
