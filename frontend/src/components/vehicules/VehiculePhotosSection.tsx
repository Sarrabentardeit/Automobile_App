import { useRef, useState } from 'react'
import type { VehiculeImage, VehiculeImageCategory, VehiculeImageUploadInput } from '@/types'
import Card from '@/components/ui/Card'
import { Camera, Image as ImageIcon, ImagePlus, Trash2 } from 'lucide-react'
import { fileToVehiculeImagePayload, isAcceptableImageFile } from '@/lib/vehiculeImageFiles'

const MAX_IMAGES = 12
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024

const IMAGE_CATEGORIES: { value: VehiculeImageCategory; label: string }[] = [
  { value: 'etat_exterieur', label: 'Etat extérieur' },
  { value: 'etat_interieur', label: 'Etat intérieur' },
  { value: 'compteur', label: 'Compteur / KM' },
  { value: 'plaque', label: 'Plaque / châssis' },
  { value: 'dommage', label: 'Dommage constaté' },
  { value: 'intervention', label: 'Intervention / pièce' },
]

type Props = {
  vehiculeId: number
  images: VehiculeImage[]
  canUpload: boolean
  canDelete: boolean
  onUpload: (payload: VehiculeImageUploadInput) => Promise<void>
  onDelete: (imageId: number) => Promise<boolean>
  onPreview: (url: string) => void
  toast: { success: (m: string) => void; error: (m: string) => void }
}

export default function VehiculePhotosSection({
  vehiculeId,
  images,
  canUpload,
  canDelete,
  onUpload,
  onDelete,
  onPreview,
  toast,
}: Props) {
  const [uploading, setUploading] = useState(false)
  const [category, setCategory] = useState<VehiculeImageCategory>('etat_exterieur')
  const [note, setNote] = useState('')
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length || uploading) return
    if (images.length >= MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} photos par véhicule`)
      return
    }

    const slots = MAX_IMAGES - images.length
    const selected = Array.from(files).slice(0, slots)
    let ok = 0
    let failed = 0

    setUploading(true)
    try {
      for (const file of selected) {
        if (!isAcceptableImageFile(file)) {
          failed += 1
          continue
        }
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
          toast.error(`Photo trop lourde (max 8 MB) : ${file.name || 'fichier'}`)
          failed += 1
          continue
        }
        try {
          const payload = await fileToVehiculeImagePayload(file, { category, note })
          await onUpload(payload)
          ok += 1
        } catch (err) {
          failed += 1
          console.error('Upload photo véhicule', vehiculeId, err)
        }
      }
      if (ok > 0) toast.success(`${ok} photo(s) enregistrée(s)`)
      if (failed > 0 && ok === 0) {
        toast.error(
          'Impossible d\'enregistrer la photo. Réessayez (galerie) ou contactez l\'administrateur.'
        )
      } else if (failed > 0) {
        toast.error(`${failed} photo(s) n'ont pas pu être envoyées`)
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-orange-500" />
        Photos du véhicule
      </h2>
      <Card padding="sm" className="space-y-3">
        {canUpload && (
          <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50/40 p-3 space-y-2">
            <p className="text-xs text-gray-600">
              Les photos sont enregistrées <strong>immédiatement</strong> (pas besoin de « Modifier » le véhicule).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={category}
                onChange={e => setCategory(e.target.value as VehiculeImageCategory)}
                disabled={uploading}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
              >
                {IMAGE_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                disabled={uploading}
                placeholder="Note (ex. rayure aile)"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <label
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 bg-white ${
                  uploading ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-50 cursor-pointer'
                }`}
              >
                <Camera className="w-4 h-4" />
                {uploading ? 'Envoi…' : 'Prendre photo'}
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  disabled={uploading}
                  onChange={e => {
                    void handleFiles(e.target.files)
                    e.target.value = ''
                  }}
                />
              </label>
              <label
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 bg-white ${
                  uploading ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-50 cursor-pointer'
                }`}
              >
                <ImagePlus className="w-4 h-4" />
                Galerie
                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={uploading}
                  onChange={e => {
                    void handleFiles(e.target.files)
                    e.target.value = ''
                  }}
                />
              </label>
            </div>
          </div>
        )}

        {images.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune photo enregistrée pour ce véhicule.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {images.map(img => (
              <div
                key={img.id}
                className="rounded-lg border border-gray-100 overflow-hidden bg-white cursor-pointer group"
              >
                <img
                  src={`/api${img.url_path}`}
                  alt={img.note || img.original_name || `Photo ${img.id}`}
                  loading="lazy"
                  onClick={() => onPreview(`/api${img.url_path}`)}
                  className="w-full h-32 md:h-40 object-cover rounded-xl shadow-sm hover:scale-[1.02] transition-transform duration-200"
                  title="Cliquez pour agrandir"
                />
                <div className="p-2 space-y-1">
                  <p className="text-[11px] text-gray-700 truncate" title={img.note || img.original_name}>
                    {img.note || img.original_name || 'Photo véhicule'}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {new Date(img.created_at).toLocaleDateString('fr-FR')}
                  </p>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={async e => {
                        e.stopPropagation()
                        const ok = await onDelete(img.id)
                        if (ok) toast.success('Photo supprimée')
                        else toast.error('Suppression impossible')
                      }}
                      className="inline-flex items-center gap-1 text-[10px] text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
