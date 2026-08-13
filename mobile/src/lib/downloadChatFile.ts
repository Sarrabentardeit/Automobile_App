import { Alert, Linking, Platform } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { resolveUploadUrl } from './config'

function mimeAndUti(fileName: string): { mimeType: string; uti?: string } {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.pdf')) return { mimeType: 'application/pdf', uti: 'com.adobe.pdf' }
  if (lower.endsWith('.png')) return { mimeType: 'image/png', uti: 'public.png' }
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    return { mimeType: 'image/jpeg', uti: 'public.jpeg' }
  }
  if (lower.endsWith('.webp')) return { mimeType: 'image/webp' }
  return { mimeType: 'application/octet-stream' }
}

/** Télécharge un fichier chat puis ouvre le partage / enregistrement. */
export async function downloadChatFile(
  pathOrUrl: string,
  fileName = 'fichier.pdf',
  opts?: { accessToken?: string }
): Promise<void> {
  const url = resolveUploadUrl(pathOrUrl)
  if (!url) throw new Error('Fichier introuvable')
  if (!FileSystem.cacheDirectory) throw new Error('Stockage indisponible')

  const safeName = (fileName || 'fichier.pdf').replace(/[^\w.\- ()[\]]+/g, '_')
  const { mimeType, uti } = mimeAndUti(safeName)
  const dir = `${FileSystem.cacheDirectory}chat-files/`
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true })
  } catch {
    /* exists */
  }
  const localPath = `${dir}${Date.now()}-${safeName}`

  const result = await FileSystem.downloadAsync(url, localPath, {
    headers: opts?.accessToken
      ? { Authorization: `Bearer ${opts.accessToken}` }
      : undefined,
  })
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Erreur ${result.status}`)
  }

  if (Platform.OS === 'android') {
    try {
      const saf = FileSystem.StorageAccessFramework
      const permissions = await saf.requestDirectoryPermissionsAsync()
      if (permissions.granted) {
        const destUri = await saf.createFileAsync(
          permissions.directoryUri,
          safeName,
          mimeType
        )
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
      mimeType,
      dialogTitle: 'Enregistrer / partager',
      ...(uti ? { UTI: uti } : {}),
    })
    return
  }

  await Linking.openURL(url)
}
