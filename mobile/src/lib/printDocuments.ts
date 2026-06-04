import * as Print from 'expo-print'
import type { OrdreReparation, VehiculeSuivi } from '../types/vehicule'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>')
}

export function buildSuiviDocumentHtml(suivi: VehiculeSuivi): string {
  const travEff = (suivi.travauxEffectues ?? '').split('\n')
  const travProch = (suivi.travauxProchains ?? '').split('\n')
  const produits = (suivi.produitsUtilises ?? '').split('\n')
  const ROWS = 12
  const maxRows = Math.max(ROWS, travEff.length, travProch.length, produits.length)

  const dataRows = Array.from({ length: maxRows }, (_, i) => `
    <tr>
      <td class="data-l">${esc(travEff[i] ?? '')}</td>
      <td class="data-m">${esc(travProch[i] ?? '')}</td>
      <td class="data-r">${esc(produits[i] ?? '')}</td>
    </tr>`).join('')

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
<style>
@page { size: A4 portrait; margin: 14mm 12mm; }
body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #111; }
.title-cell { text-align:center; font-size:28pt; background:#D7E4BD; border:1px solid #888; padding:8px; }
.lbl { background:#D7E4BD; border:1px solid #888; font-weight:bold; padding:4px 8px; }
.val { border:1px solid #888; padding:4px 8px; }
.th { background:#B9CDE5; border:1px solid #888; font-weight:bold; text-align:center; padding:5px; }
.data-l,.data-m,.data-r { border:1px solid #888; padding:3px 8px; height:22px; }
.tech { background:#C6D9F1; border:2px solid #888; padding:6px 12px; }
</style></head><body>
<table style="width:100%;border-collapse:collapse"><tr><td class="title-cell">SUIVI</td></tr></table>
<div style="text-align:center;font-size:9pt;margin:4px 0">${esc(suivi.numero ?? '')}</div>
<table style="width:100%;border-collapse:collapse">
<tr><td class="lbl">Date :</td><td class="val">${esc(suivi.date ?? '')}</td><td class="lbl">Voiture :</td><td class="val">${esc(suivi.voiture ?? '')}</td></tr>
<tr><td class="lbl">Kilométrage :</td><td class="val">${esc(suivi.kilometrage ?? '')}</td><td class="lbl">Matricule :</td><td class="val">${esc(suivi.matricule ?? '')}</td></tr>
</table>
<table style="width:100%;border-collapse:collapse;margin-top:6px">
<thead><tr><th class="th" style="width:41%">TRAVAUX EFFECTUÉES</th><th class="th" style="width:36%">TRAVAUX PROCHAINS</th><th class="th" style="width:23%">PRODUITS UTILISÉS</th></tr></thead>
<tbody>${dataRows}</tbody>
</table>
<table style="width:100%;margin-top:6px"><tr>
<td class="tech">TECHNICIEN : ${esc(suivi.technicien ?? '')}</td>
<td class="lbl">Fiche remplie par :</td><td class="val">${esc(suivi.rempliPar ?? '')}</td>
</tr></table>
</body></html>`
}

export function buildOrdreDocumentHtml(ord: OrdreReparation): string {
  const lignesRows = ord.lignes
    .map(
      (l) =>
        `<tr><td>${esc(l.description)}</td><td>${esc(
          l.statut === 'fait' ? 'Fait' : l.statut === 'na' ? 'N/A' : 'À faire'
        )}</td></tr>`
    )
    .join('')

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
<style>
body { font-family: Arial, sans-serif; font-size: 10pt; }
h1 { text-align:center; font-size:18pt; }
table { width:100%; border-collapse:collapse; margin-top:8px; }
td, th { border:1px solid #333; padding:4px 6px; vertical-align:top; }
th { background:#d9d9d9; }
.lbl { font-weight:bold; background:#eee; width:28%; }
</style></head><body>
<h1>ORDRE DE RÉPARATION</h1>
<p style="text-align:center"><strong>${esc(ord.numero)}</strong></p>
<table>
<tr><td class="lbl">Client</td><td>${esc(ord.clientNom)}</td><td class="lbl">Tél.</td><td>${esc(ord.clientTelephone)}</td></tr>
<tr><td class="lbl">Voiture</td><td>${esc(ord.voiture)}</td><td class="lbl">Immat.</td><td>${esc(ord.immatriculation)}</td></tr>
<tr><td class="lbl">Date entrée</td><td>${esc(ord.dateEntree)}</td><td class="lbl">Technicien</td><td>${esc(ord.technicien)}</td></tr>
<tr><td class="lbl">Kilométrage</td><td>${esc(ord.kilometrage != null ? String(ord.kilometrage) : '')}</td><td class="lbl">VIN</td><td>${esc(ord.vin)}</td></tr>
</table>
<h3>Travaux demandés</h3>
<table><thead><tr><th>Description</th><th>Statut</th></tr></thead><tbody>${lignesRows}</tbody></table>
<p style="margin-top:12px;font-size:9pt">Rempli par : ${esc(ord.rempliPar)}</p>
</body></html>`
}

export async function printSuivi(suivi: VehiculeSuivi): Promise<void> {
  const html = buildSuiviDocumentHtml(suivi)
  await Print.printAsync({ html })
}

export async function printOrdre(ord: OrdreReparation): Promise<void> {
  const html = buildOrdreDocumentHtml(ord)
  await Print.printAsync({ html })
}
