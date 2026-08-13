import { useEffect, useRef, useState } from 'react'
import Modal from '@/components/ui/Modal'
import { resolveUploadUrl } from '@/lib/api'
import { Camera, Trash2 } from 'lucide-react'

function splitName(full: string): { prenom: string; nom: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { prenom: '', nom: '' }
  if (parts.length === 1) return { prenom: parts[0], nom: '' }
  return { prenom: parts[0], nom: parts.slice(1).join(' ') }
}

function joinName(prenom: string, nom: string): string {
  return [prenom.trim(), nom.trim()].filter(Boolean).join(' ')
}

type Props = {
  open: boolean
  onClose: () => void
  initialFullName: string
  initialTelephone?: string
  initialAvatarUrl?: string | null
  saving?: boolean
  error?: string | null
  onSave: (data: {
    fullName: string
    telephone: string
    avatarDataUrl?: string | null
    removeAvatar?: boolean
  }) => Promise<void>
}

export default function ProfileEditModal({
  open,
  onClose,
  initialFullName,
  initialTelephone = '',
  initialAvatarUrl,
  saving = false,
  error = null,
  onSave,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)

  useEffect(() => {
    if (!open) return
    const s = splitName(initialFullName)
    setPrenom(s.prenom)
    setNom(s.nom)
    setTelephone(initialTelephone)
    setPreview(initialAvatarUrl ? resolveUploadUrl(initialAvatarUrl, Date.now()) : null)
    setAvatarDataUrl(null)
    setRemoveAvatar(false)
  }, [open, initialFullName, initialTelephone, initialAvatarUrl])

  const onPickFile = (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const data = String(reader.result || '')
      if (!data.startsWith('data:image/')) return
      setAvatarDataUrl(data)
      setPreview(data)
      setRemoveAvatar(false)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fullName = joinName(prenom, nom)
    if (fullName.length < 2) return
    await onSave({
      fullName,
      telephone: telephone.trim(),
      avatarDataUrl: avatarDataUrl ?? undefined,
      removeAvatar: removeAvatar || undefined,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Mon profil" subtitle="Modifier votre nom et votre photo" maxWidth="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {preview && !removeAvatar ? (
              <img
                src={preview}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-4 border-orange-100 shadow"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-3xl font-bold text-white shadow">
                {(prenom || nom || '?').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800"
            >
              <Camera className="w-3.5 h-3.5" />
              Photo
            </button>
            {(preview || initialAvatarUrl) && !removeAvatar ? (
              <button
                type="button"
                onClick={() => {
                  setRemoveAvatar(true)
                  setAvatarDataUrl(null)
                  setPreview(null)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Retirer
              </button>
            ) : null}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Prénom</span>
            <input
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Prénom"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Nom</span>
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Nom"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-gray-600">Téléphone</span>
          <input
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="Optionnel"
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100"
            disabled={saving}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving || joinName(prenom, nom).length < 2}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
