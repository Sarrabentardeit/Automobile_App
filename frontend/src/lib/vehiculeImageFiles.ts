import type { VehiculeImageCategory, VehiculeImageUploadInput } from '@/types'

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|heic|heif)$/i

/** Caméra mobile : type souvent vide — ne pas rejeter silencieusement. */
export function isAcceptableImageFile(file: File): boolean {
  const type = (file.type || '').toLowerCase()
  if (type.startsWith('image/')) return true
  if (type === 'application/octet-stream' || type === '') {
    const name = file.name || ''
    if (IMAGE_EXT_RE.test(name)) return true
    // Fichier issu d'un input accept="image/*" (capture caméra)
    return true
  }
  return false
}

export function inferImageMimeType(file: File): string {
  const type = (file.type || '').toLowerCase()
  if (type === 'image/jpg') return 'image/jpeg'
  if (type.startsWith('image/')) return type
  const name = (file.name || '').toLowerCase()
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.webp')) return 'image/webp'
  if (name.endsWith('.heic') || name.endsWith('.heif')) return 'image/heic'
  return 'image/jpeg'
}

/** Corrige data:;base64 ou octet-stream pour l'API (JPEG/PNG/WEBP/HEIC uniquement). */
export function normalizeImageDataUrl(dataUrl: string, mimeType: string): string {
  const match = dataUrl.match(/^data:([^;]*);base64,(.+)$/i)
  if (!match) return dataUrl
  const current = (match[1] || '').toLowerCase()
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
  const target = allowed.has(mimeType) ? mimeType : 'image/jpeg'
  if (!current || current === 'application/octet-stream' || !current.startsWith('image/')) {
    return `data:${target};base64,${match[2]}`
  }
  if (current === 'image/jpg') return `data:image/jpeg;base64,${match[2]}`
  return dataUrl
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Erreur lecture fichier'))
    reader.readAsDataURL(file)
  })
}

export async function fileToVehiculeImagePayload(
  file: File,
  options: { category: VehiculeImageCategory; note: string }
): Promise<VehiculeImageUploadInput> {
  const mimeType = inferImageMimeType(file)
  const raw = await readFileAsDataUrl(file)
  return {
    dataUrl: normalizeImageDataUrl(raw, mimeType),
    fileName: file.name || `photo.${mimeType === 'image/png' ? 'png' : 'jpg'}`,
    category: options.category,
    note: options.note.trim(),
  }
}
