import * as FileSystem from 'expo-file-system/legacy'
import * as IntentLauncher from 'expo-intent-launcher'
import * as Print from 'expo-print'
import * as SecureStore from 'expo-secure-store'
import * as Sharing from 'expo-sharing'
import { Alert, Platform } from 'react-native'
import { computeFactureAchatTotals } from './factureUtils'
import { formatMontantEnLettres } from './factureVentePdf'
import { theme } from '../theme/appTheme'
import { MODE_PAIEMENT_OPTIONS, type FactureAchat } from '../types/factureAchat'

const DOWNLOADS_FOLDER_KEY = 'facture_achat_downloads_uri'

const ACCENT = theme.primary
const ACCENT_DARK = theme.primaryDark
const ACCENT_SOFT = theme.primarySoft
const ACCENT_BORDER = '#fed7aa'

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function modePaiementLabel(v: string) {
  return MODE_PAIEMENT_OPTIONS.find((o) => o.value === v)?.label ?? v
}

export function buildFactureAchatPdfHtml(facture: FactureAchat): string {
  const timbre = facture.timbre ?? 1
  const { totalHT, tva19, depenses, totalTTC } = computeFactureAchatTotals(facture.lignes, timbre)
  const dateFormatted = new Date(facture.date + 'T12:00:00').toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const rowsProduits = facture.lignes
    .map(
      (l) =>
        `<tr><td>${l.quantite}</td><td>${escapeHtml(l.designation)}</td><td class="text-right">${l.prixUnitaire.toFixed(2)}</td><td class="text-right">${(l.quantite * l.prixUnitaire).toFixed(2)}</td></tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Facture achat ${escapeHtml(facture.numero)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: ${theme.text}; margin: 0; padding: 16px; }
    .invoice { max-width: 800px; margin: 0 auto; background: #fff; padding: 20px 24px; border-radius: 8px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid ${ACCENT}; padding-bottom: 14px; margin-bottom: 18px; }
    .company { font-size: 17px; font-weight: 700; color: ${ACCENT}; text-transform: uppercase; letter-spacing: 0.04em; }
    .company-sub { font-size: 11px; color: ${theme.textMuted}; margin-top: 4px; }
    .title { font-size: 20px; font-weight: 700; text-align: right; text-transform: uppercase; letter-spacing: 0.06em; }
    .meta { font-size: 11px; color: ${theme.textSecondary}; text-align: right; margin-top: 6px; }
    .card { background: ${ACCENT_SOFT}; border: 1px solid ${ACCENT_BORDER}; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; }
    .card-title { font-size: 10px; font-weight: 600; text-transform: uppercase; color: ${theme.textMuted}; margin-bottom: 6px; }
    .client-name { font-size: 13px; font-weight: 600; }
    .client-line { font-size: 11px; color: ${theme.textSecondary}; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; }
    thead th { font-size: 10px; text-transform: uppercase; background: ${theme.surfaceMuted}; color: ${theme.textMuted}; padding: 7px 8px; border-bottom: 1px solid ${theme.border}; text-align: left; }
    tbody td { font-size: 11px; padding: 6px 8px; border-bottom: 1px solid ${theme.borderLight}; vertical-align: top; }
    .cat td { background: ${ACCENT_SOFT}; font-weight: 600; font-size: 10px; text-transform: uppercase; color: ${ACCENT_DARK}; }
    .text-right { text-align: right; }
    .muted { color: ${theme.textSubtle}; }
    .totaux-wrap { display: flex; justify-content: flex-end; margin-top: 14px; }
    .totaux { width: 260px; font-size: 11px; }
    .totaux td { padding: 4px 0; border-bottom: 1px solid ${theme.border}; }
    .totaux .lbl { color: ${theme.textSecondary}; }
    .totaux .val { text-align: right; }
    .ttc { font-size: 14px; font-weight: 700; color: ${ACCENT}; border-bottom: none !important; padding-top: 8px !important; }
    .lettres { margin-top: 16px; padding: 10px 12px; background: ${ACCENT_SOFT}; border: 1px solid ${ACCENT_BORDER}; border-radius: 8px; font-style: italic; font-size: 11px; color: ${ACCENT_DARK}; }
    .footer { margin-top: 14px; font-size: 10px; color: ${theme.textSubtle}; text-align: right; }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div>
        <div class="company">EL MECANO GARAGE</div>
        <div class="company-sub">Matricule fiscale : 1864720/M</div>
      </div>
      <div>
        <div class="title">Facture d&apos;achat</div>
        <div class="meta">
          <div>N° interne : ${escapeHtml(facture.numero)}</div>
          <div>Date : ${dateFormatted}</div>
          ${facture.numeroFactureFournisseur ? `<div>N° fact. fourn. : ${escapeHtml(facture.numeroFactureFournisseur)}</div>` : ''}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Fournisseur</div>
      <div class="client-name">${escapeHtml(facture.fournisseurNom)}</div>
      ${facture.modePaiement ? `<div class="client-line">Mode de paiement : ${escapeHtml(modePaiementLabel(facture.modePaiement))}</div>` : ''}
    </div>
    <table>
      <thead>
        <tr><th style="width:8%">Qté</th><th style="width:52%">Désignation</th><th style="width:20%" class="text-right">P.U. HT</th><th style="width:20%" class="text-right">Total HT</th></tr>
      </thead>
      <tbody>
        <tr class="cat"><td colspan="4">Produits</td></tr>
        ${rowsProduits || '<tr><td colspan="4" class="muted">—</td></tr>'}
      </tbody>
    </table>
    <div class="totaux-wrap">
      <table class="totaux">
        <tr><td class="lbl">Total HT</td><td class="val">${totalHT.toFixed(2)} DT</td></tr>
        <tr><td class="lbl">TVA 19%</td><td class="val">${tva19.toFixed(2)} DT</td></tr>
        <tr><td class="lbl">Dépenses</td><td class="val">${depenses.toFixed(2)} DT</td></tr>
        <tr><td class="lbl">D. timbre</td><td class="val">${timbre.toFixed(2)} DT</td></tr>
        <tr><td class="lbl ttc">Total TTC</td><td class="val ttc">${totalTTC.toFixed(2)} DT</td></tr>
      </table>
    </div>
    <div class="lettres">Arrêtée la présente facture à la somme de : <strong>${formatMontantEnLettres(totalTTC)}</strong></div>
    <div class="footer">Document d&apos;achat fournisseur — entrée stock après validation.</div>
  </div>
</body>
</html>`
}

function safeFilename(numero: string) {
  return numero.replace(/[^\w.-]+/g, '-').slice(0, 60) || 'facture-achat'
}

async function prepareFacturePdfFile(facture: FactureAchat): Promise<string> {
  const html = buildFactureAchatPdfHtml(facture)
  const { uri: tempUri } = await Print.printToFileAsync({ html })
  const filename = `Facture-Achat-${safeFilename(facture.numero)}.pdf`
  const dir = `${FileSystem.documentDirectory}Factures-Achat/`
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true })
  const localPath = `${dir}${filename}`
  await FileSystem.deleteAsync(localPath, { idempotent: true })
  await FileSystem.copyAsync({ from: tempUri, to: localPath })
  const info = await FileSystem.getInfoAsync(localPath)
  if (!info.exists) throw new Error('Échec création du PDF')
  return localPath
}

const ANDROID_READ_URI_FLAG = 1

async function openPdfFile(localPath: string): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      const contentUri = await FileSystem.getContentUriAsync(localPath)
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        type: 'application/pdf',
        flags: ANDROID_READ_URI_FLAG,
      })
      return
    } catch {
      /* fallback partage */
    }
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(localPath, {
      mimeType: 'application/pdf',
      dialogTitle: 'Ouvrir le PDF avec…',
      UTI: 'com.adobe.pdf',
    })
    return
  }

  throw new Error("Impossible d'ouvrir le PDF sur cet appareil")
}

async function writePdfToSafFolder(
  localPath: string,
  directoryUri: string,
  baseName: string
): Promise<void> {
  const saf = FileSystem.StorageAccessFramework
  if (!saf) throw new Error('Enregistrement indisponible')

  const destUri = await saf.createFileAsync(directoryUri, baseName, 'application/pdf')
  const base64 = await FileSystem.readAsStringAsync(localPath, {
    encoding: FileSystem.EncodingType.Base64,
  })
  await FileSystem.writeAsStringAsync(destUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  })
}

async function trySaveToDownloadsAndroid(localPath: string, baseName: string): Promise<boolean> {
  const cached = await SecureStore.getItemAsync(DOWNLOADS_FOLDER_KEY)
  if (!cached) return false
  try {
    await writePdfToSafFolder(localPath, cached, baseName)
    return true
  } catch {
    await SecureStore.deleteItemAsync(DOWNLOADS_FOLDER_KEY)
    return false
  }
}

export async function shareFactureAchatPdf(facture: FactureAchat): Promise<void> {
  const localPath = await prepareFacturePdfFile(facture)

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(localPath, {
      mimeType: 'application/pdf',
      dialogTitle: `Envoyer facture ${facture.numero}`,
      UTI: 'com.adobe.pdf',
    })
    return
  }

  Alert.alert('PDF généré', `Fichier temporaire :\n${localPath}`)
}

export type DownloadFactureAchatResult = 'saved_downloads' | 'opened_viewer'

export async function downloadFactureAchatPdf(
  facture: FactureAchat
): Promise<DownloadFactureAchatResult> {
  const localPath = await prepareFacturePdfFile(facture)
  const baseName = `Facture-Achat-${safeFilename(facture.numero)}`

  if (Platform.OS === 'android' && (await trySaveToDownloadsAndroid(localPath, baseName))) {
    return 'saved_downloads'
  }

  try {
    await openPdfFile(localPath)
    return 'opened_viewer'
  } catch {
    await Print.printAsync({ html: buildFactureAchatPdfHtml(facture) })
    return 'opened_viewer'
  }
}
