import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { Alert } from 'react-native'
import { apiUrl } from './config'

function safeFilename(name: string): string {
  return name.replace(/[^\w.-]+/g, '_').slice(0, 80) || 'document'
}

/**
 * Télécharge le .xlsx généré par le serveur (même modèle Excel que le web)
 * et ouvre le menu partager (Excel, Drive, impression, etc.).
 */
export async function downloadAndShareExcel(
  token: string,
  apiPath: string,
  filenameBase: string
): Promise<void> {
  const url = apiUrl(apiPath)
  const fileUri = `${FileSystem.cacheDirectory}${safeFilename(filenameBase)}.xlsx`

  const result = await FileSystem.downloadAsync(url, fileUri, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  })

  if (result.status < 200 || result.status >= 300) {
    throw new Error('Erreur export Excel')
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Ouvrir avec Excel',
    })
  } else {
    Alert.alert(
      'Fichier enregistré',
      `Le fichier a été téléchargé :\n${result.uri}`
    )
  }
}

export function downloadSuiviExcel(
  token: string,
  vehiculeId: number,
  suiviId: number,
  numero: string
): Promise<void> {
  return downloadAndShareExcel(
    token,
    `/vehicules/${vehiculeId}/suivis/${suiviId}/excel`,
    numero || `suivi-${suiviId}`
  )
}

export function downloadOrdreExcel(
  token: string,
  vehiculeId: number,
  ordreId: number,
  numero: string
): Promise<void> {
  return downloadAndShareExcel(
    token,
    `/vehicules/${vehiculeId}/ordres-reparation/${ordreId}/excel`,
    numero || `OR-${ordreId}`
  )
}
