import * as FileSystem from 'expo-file-system/legacy'
import * as ImageManipulator from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import type { VehiculeImageCategory, VehiculeImageUploadInput } from '../types/vehicule'

export type PreparedImage = {
  uri: string
  payload: VehiculeImageUploadInput
}

/** Always produce a JPEG data URL so Android camera + iPhone HEIC never break upload. */
async function toJpegUpload(
  uri: string,
  category: VehiculeImageCategory,
  note: string,
  originalName?: string | null
): Promise<PreparedImage | null> {
  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1600 } }],
      {
        compress: 0.72,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    )

    let base64 = manipulated.base64 ?? null
    if (!base64 && manipulated.uri) {
      base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
        encoding: FileSystem.EncodingType.Base64,
      })
    }
    if (!base64) return null

    const safeName = (originalName ?? '').trim().replace(/\.[^.]+$/, '') || `photo-${Date.now()}`
    return {
      uri: manipulated.uri,
      payload: {
        dataUrl: `data:image/jpeg;base64,${base64}`,
        fileName: `${safeName}.jpg`,
        category,
        note: note.trim(),
      },
    }
  } catch {
    // Fallback: read original URI as base64 and force JPEG mime (works for most Android cameras)
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      })
      if (!base64) return null
      return {
        uri,
        payload: {
          dataUrl: `data:image/jpeg;base64,${base64}`,
          fileName: `photo-${Date.now()}.jpg`,
          category,
          note: note.trim(),
        },
      }
    } catch {
      return null
    }
  }
}

export async function pickVehiculeImages(opts: {
  useCamera: boolean
  category: VehiculeImageCategory
  note?: string
  selectionLimit?: number
}): Promise<PreparedImage[]> {
  const { useCamera, category, note = '', selectionLimit = 1 } = opts

  const perm = useCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) {
    throw new Error(
      useCamera
        ? 'Autorisez l’accès à la caméra dans les paramètres du téléphone.'
        : 'Autorisez l’accès aux photos dans les paramètres du téléphone.'
    )
  }

  const pickerOpts: ImagePicker.ImagePickerOptions = {
    quality: 1,
    base64: false,
    exif: false,
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  }

  const result = useCamera
    ? await ImagePicker.launchCameraAsync(pickerOpts)
    : await ImagePicker.launchImageLibraryAsync({
        ...pickerOpts,
        allowsMultipleSelection: selectionLimit > 1,
        selectionLimit: Math.max(1, selectionLimit),
      })

  if (result.canceled || !result.assets?.length) return []

  const prepared: PreparedImage[] = []
  for (const asset of result.assets) {
    if (!asset?.uri) continue
    const item = await toJpegUpload(asset.uri, category, note, asset.fileName)
    if (item) prepared.push(item)
  }
  return prepared
}
