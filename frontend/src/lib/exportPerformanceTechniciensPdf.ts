export type PerfServiceAgg = {
  service_type: string
  label: string
  count: number
  moyenneMinutes: number
}

export type PerfMarque = { name: string; count: number }

export type PerfTechnicien = {
  technicienId: number
  nom: string
  rang?: number
  vehiculesCount: number
  marquesCount?: number
  marques?: PerfMarque[]
  totalMinutes: number
  moyenneMinutes: number
  byServiceType?: PerfServiceAgg[]
}

export type PerfReportInput = {
  year: number
  month: number
  techniciens: PerfTechnicien[]
}

function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDuree(minutes: number): string {
  if (!minutes || minutes <= 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h <= 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

function monthName(month: number): string {
  const raw = new Date(2000, month - 1, 1).toLocaleString('fr-FR', { month: 'long' })
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function mainServices(t: PerfTechnicien, max = 3): string {
  const list = [...(t.byServiceType ?? [])].sort((a, b) => b.count - a.count).slice(0, max)
  if (list.length === 0) return '—'
  return list.map(s => `${s.count} ${s.label}`).join(', ')
}

function buildReportHtml(input: PerfReportInput): string {
  const { year, month, techniciens } = input
  const mois = monthName(month)
  const periode = `${mois} ${year}`

  const ranked = [...techniciens].sort(
    (a, b) => (a.rang ?? 999) - (b.rang ?? 999) || b.vehiculesCount - a.vehiculesCount
  )

  const rankingRows = ranked
    .map((t, idx) => {
      const rang = t.rang ?? idx + 1
      return `
        <tr>
          <td class="center">${rang}</td>
          <td class="name">${esc(t.nom)}</td>
          <td class="center">${t.vehiculesCount}</td>
          <td class="center">${t.marquesCount ?? t.marques?.length ?? '—'}</td>
          <td class="center">${esc(formatDuree(t.moyenneMinutes))}</td>
          <td class="svc">${esc(mainServices(t))}</td>
        </tr>`
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #222;
    background: #fff;
  }
  .page {
    width: 794px;
    min-height: 1123px;
    padding: 44px 48px 52px;
    background: #fff;
  }
  .title {
    text-align: center;
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .subtitle {
    text-align: center;
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 22px;
  }
  .intro {
    font-size: 12.5px;
    line-height: 1.5;
    text-align: justify;
    margin-bottom: 20px;
  }
  .section-label {
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 8px;
  }
  table.rank {
    width: 100%;
    border-collapse: collapse;
    font-size: 11.5px;
    margin-bottom: 22px;
  }
  table.rank th {
    background: #2f3a4a;
    color: #fff;
    padding: 9px 6px;
    text-align: center;
    font-weight: 700;
    font-size: 10px;
    text-transform: uppercase;
  }
  table.rank th:nth-child(2) { text-align: left; padding-left: 10px; }
  table.rank th:nth-child(6) { text-align: left; padding-left: 8px; }
  table.rank td {
    padding: 8px 6px;
    border-bottom: 1px solid #ddd;
    vertical-align: middle;
  }
  table.rank tr:nth-child(even) td { background: #f4f4f4; }
  table.rank tr:nth-child(-n+3) td { background: #fff4e8; }
  table.rank .center { text-align: center; font-weight: 600; }
  table.rank .name { text-align: left; padding-left: 10px; font-weight: 700; }
  table.rank .svc { text-align: left; padding-left: 8px; font-size: 10.5px; color: #444; }
  .conclusion {
    font-size: 12.5px;
    line-height: 1.5;
  }
</style>
</head>
<body>
  <div class="page">
    <h1 class="title">EL MECANO GARAGE</h1>
    <p class="subtitle">Rapport de performance des techniciens – ${esc(periode)}</p>

    <p class="intro">
      Chez El Mecano Garage, nous accordons une grande importance à la qualité de service,
      au professionnalisme et à la satisfaction de nos clients. Ce rapport présente les
      performances de nos techniciens pour le mois de <strong>${esc(mois)}</strong> ${year},
      évaluées selon le nombre de véhicules pris en charge et la diversité des marques traitées.
      Ces résultats mettent en valeur l’engagement de notre équipe et encouragent une
      amélioration continue de nos prestations.
    </p>

    <p class="section-label">Classement général</p>
    <table class="rank">
      <thead>
        <tr>
          <th style="width:48px">Rang</th>
          <th>Nom du technicien</th>
          <th style="width:72px">Véhicules</th>
          <th style="width:68px">Marques</th>
          <th style="width:78px">Temps moy.</th>
          <th>Services principaux</th>
        </tr>
      </thead>
      <tbody>
        ${rankingRows}
      </tbody>
    </table>

    <p class="conclusion">
      <strong>Conclusion :</strong>
      Nous remercions l’ensemble de nos techniciens pour leur implication et leur professionnalisme.
      Félicitations aux collaborateurs ayant obtenu les meilleurs résultats et encourageons toute
      l’équipe à poursuivre cette dynamique d’excellence.
    </p>
  </div>
</body>
</html>`
}

/** Exporte un rapport PDF simple et lisible pour le mois choisi. */
export async function exportPerformanceTechniciensPdf(input: PerfReportInput): Promise<void> {
  if (!input.techniciens.length) {
    throw new Error('Aucune donnée à exporter pour ce mois')
  }

  const [html2canvas, jspdfModule] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])
  const jsPDF = jspdfModule.default

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.left = '0'
  iframe.style.top = '0'
  iframe.style.width = '794px'
  iframe.style.height = '1123px'
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
  doc.write(buildReportHtml(input))
  doc.close()

  await new Promise<void>(resolve => setTimeout(resolve, 250))

  try {
    const target = doc.querySelector('.page') as HTMLElement | null
    if (!target) throw new Error('Aucune page générée')

    const canvas = await html2canvas.default(target, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 794,
    })

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
    const pdfW = pdf.internal.pageSize.getWidth()
    const pdfH = pdf.internal.pageSize.getHeight()

    const imgData = canvas.toDataURL('image/jpeg', 0.95)
    const imgW = pdfW
    const imgH = (canvas.height * pdfW) / canvas.width

    let heightLeft = imgH
    let position = 0

    pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH)
    heightLeft -= pdfH

    while (heightLeft > 2) {
      position -= pdfH
      pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH)
      heightLeft -= pdfH
    }

    pdf.save(`Rapport-performance-${monthName(input.month)}-${input.year}.pdf`)
  } finally {
    document.body.removeChild(iframe)
  }
}
