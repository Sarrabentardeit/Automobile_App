import { Alert, Linking, Platform } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { resolveUploadUrl } from './config'

/** Télécharge un fichier chat puis ouvre le partage / enregistrement. */
export async function downloadChatFile(
  pathOrUrl: string,
  fileName = 'fichier.pdf'
): Promise<void> {
  const url = resolveUploadUrl(pathOrUrl)
  if (!url) throw new Error('Fichier introuvable')

  const safeName = (fileName || 'fichier.pdf').replace(/[^\w.\- ()[\]]+/g, '_')
  const dir = `${FileSystem.cacheDirectory}chat-files/`
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true })
  const localPath = `${dir}${Date.now()}-${safeName}`

  const result = await FileSystem.downloadAsync(url, localPath)
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Erreur ${result.status}`)
  }

  if (Platform.OS === 'android') {
    try {
      const saf = FileSystem.StorageAccessFramework
      const permissions = await saf.requestDirectoryPermissionsAsync()
      if (permissions.granted) {
        const mime =
          safeName.toLowerCase().endsWith('.pdf')
            ? 'application/pdf'
            : 'application/octet-stream'
        const destUri = await saf.createFileAsync(permissions.directoryUri, safeName, mime)
        const base64 = await FileSystem.readAsStringAsync(result.uri, {
          encoding: FileSystem.EncodingType.Base64,
        })
        await FileSystem.writeAsStringAsync(destUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        })
        Alert.alert('Téléchargé', `${safeName} enregistré.`)
        return
      }
    } catch {
      /* fallback sharing */
    }
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, {
      mimeType: safeName.toLowerCase().endsWith('.pdf')
        ? 'application/pdf'
        : 'application/octet-stream',
      dialogTitle: 'Enregistrer / partager',
      UTI: 'com.adobe.pdf',
    })
    return
  }

  await Linking.openURL(url)
}
