import { useState } from 'react'
import type {
  Vehicule,
  VehiculeFormData,
  VehiculeType,
  EtatVehicule,
  VehiculeImageCategory,
  VehiculeImageUploadInput,
} from '@/types'
import { ETAT_CONFIG } from '@/types'
import { useUsers } from '@/contexts/UsersContext'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import { Save, Car, Bike, Camera, ImagePlus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  vehicule: Vehicule | null
  onClose: () => void
  onSubmit: (data: VehiculeFormData, images: VehiculeImageUploadInput[]) => void
}

const today = () => new Date().toISOString().split('T')[0]

const ETATS_ENTREE: EtatVehicule[] = ['orange', 'mauve', 'bleu', 'rouge', 'remise_cle', 'vert', 'retour']
const MAX_IMAGES = 12
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024
const BRAND_OPTIONS = [
  'Audi',
  'Bmw',
  'Changan',
  'Cherry',
  'Chevrolet',
  'Citroen',
  'Dacia',
  'Fiat',
  'Ford',
  'Haval',
  'Honda',
  'Hyundai',
  'Jeep',
  'Kia',
  'Mazda',
  'Mercedes',
  'Mg',
  'Mini',
  'Mitsubishi',
  'Nissan',
  'Opel',
  'Peugeot',
  'Porsche',
  'Range',
  'Renault',
  'Ssangyong',
  'Seat',
  'Skoda',
  'Suzuki',
  'Toyota',
  'Volkswagen',
  'Volvo',
  'Jetour',
  'Geely',
  'Isuzu',
  'Mahindra',
  'Tata',
  'Lada',
] as const

function parseMarqueModele(fullModele: string): { marque: string; modele: string } {
  const raw = (fullModele || '').trim()
  if (!raw) return { marque: '', modele: '' }
  for (const marque of BRAND_OPTIONS) {
    const lower = marque.toLowerCase()
    if (raw.toLowerCase() === lower) return { marque, modele: '' }
    if (raw.toLowerCase().startsWith(`${lower} `)) {
      return { marque, modele: raw.slice(marque.length).trim() }
    }
  }
  return { marque: '', modele: raw }
}

const IMAGE_CATEGORIES: { value: VehiculeImageCategory; label: string }[] = [
  { value: 'etat_exterieur', label: 'Etat extérieur' },
  { value: 'etat_interieur', label: 'Etat intérieur' },
  { value: 'compteur', label: 'Compteur / KM' },
  { value: 'plaque', label: 'Plaque / châssis' },
  { value: 'dommage', label: 'Dommage constaté' },
  { value: 'intervention', label: 'Intervention / pièce' },
]

interface PendingImage {
  id: string
  previewUrl: string
  payload: VehiculeImageUploadInput
}

export default function VehiculeForm({ vehicule, onClose, onSubmit }: Props) {
  const { users } = useUsers()
  const isEdit = !!vehicule
  const parsedModele = parseMarqueModele(vehicule?.modele ?? '')
  const [form, setForm] = useState<VehiculeFormData>({
    modele: parsedModele.modele,
    immatriculation: vehicule?.immatriculation ?? '',
    type: vehicule?.type ?? 'voiture',
    etat_initial: vehicule?.etat_actuel ?? 'orange',
    date_entree: vehicule?.date_entree ?? today(),
    defaut: vehicule?.defaut ?? '',
    technicien_id: vehicule?.technicien_id ?? null,
    responsable_id: vehicule?.responsable_id ?? null,
    technicien_ids: vehicule?.technicien_ids?.length ? vehicule.technicien_ids : (vehicule?.technicien_id ? [vehicule.technicien_id] : []),
    responsable_ids: vehicule?.responsable_ids?.length ? vehicule.responsable_ids : (vehicule?.responsable_id ? [vehicule.responsable_id] : []),
    client_telephone: vehicule?.client_telephone ?? '',
    notes: vehicule?.notes ?? '',
    service_type: vehicule?.service_type ?? 'diagnostic',
  })
  const [selectedMarque, setSelectedMarque] = useState<string>(parsedModele.marque)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const [imageCategory, setImageCategory] = useState<VehiculeImageCategory>('etat_exterieur')
  const [imageNote, setImageNote] = useState('')

  const responsables = users.filter(
    u => u.statut === 'actif' && (u.role === 'admin' || u.role === 'responsable' || u.role === 'technicien')
  )
  const techniciens = responsables

  const toggleAssignee = (field: 'technicien_ids' | 'responsable_ids', userId: number) => {
    setForm(prev => {
      const current = prev[field]
      const next = current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId]
      return {
        ...prev,
        [field]: next,
        ...(field === 'technicien_ids' ? { technicien_id: next[0] ?? null } : {}),
        ...(field === 'responsable_ids' ? { responsable_id: next[0] ?? null } : {}),
      }
    })
  }

  const update = (field: keyof VehiculeFormData, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.modele.trim()) e.modele = 'Le modèle est obligatoire'
    if (!form.defaut.trim()) e.defaut = 'Le défaut est obligatoire'
    if (!form.date_entree) e.date_entree = 'La date d\'entrée est obligatoire'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    const modelName = form.modele.trim()
    const mergedModele = selectedMarque ? `${selectedMarque} ${modelName}`.trim() : modelName
    onSubmit(
      { ...form, modele: mergedModele },
      pendingImages.map(img => img.payload)
    )
  }

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.onerror = () => reject(new Error('Erreur lecture fichier'))
      reader.readAsDataURL(file)
    })

  const handlePickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const availableSlots = Math.max(0, MAX_IMAGES - pendingImages.length)
    if (availableSlots <= 0) {
      setErrors(prev => ({ ...prev, images: `Maximum ${MAX_IMAGES} photos` }))
      return
    }

    const selected = Array.from(files).slice(0, availableSlots)
    const accepted: PendingImage[] = []
    for (const file of selected) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setErrors(prev => ({ ...prev, images: `Une image dépasse 8 MB (${file.name})` }))
        continue
      }
      try {
        const dataUrl = await readFileAsDataUrl(file)
        accepted.push({
          id: `${Date.now()}-${Math.random()}`,
          previewUrl: URL.createObjectURL(file),
          payload: {
            dataUrl,
            fileName: file.name,
            category: imageCategory,
            note: imageNote.trim(),
          },
        })
      } catch {
        setErrors(prev => ({ ...prev, images: `Impossible de lire le fichier ${file.name}` }))
      }
    }

    if (accepted.length > 0) {
      setPendingImages(prev => [...prev, ...accepted])
      setErrors(prev => {
        const next = { ...prev }
        delete next.images
        return next
      })
    }
  }

  const removePendingImage = (id: string) => {
    setPendingImages(prev => {
      const found = prev.find(x => x.id === id)
      if (found) URL.revokeObjectURL(found.previewUrl)
      return prev.filter(x => x.id !== id)
    })
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={isEdit ? 'Modifier le véhicule' : 'Ajouter un véhicule'}
      subtitle={isEdit ? `${vehicule.modele} - ${vehicule.immatriculation}` : undefined}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        {/* Type toggle */}
        <div className="space-y-1.5">
          <label className="block text-xs sm:text-sm font-medium text-gray-700">Type de véhicule</label>
          <div className="flex gap-2">
            {([['voiture', Car, 'Voiture'] as const, ['moto', Bike, 'Moto'] as const]).map(([type, Icon, label]) => (
              <button key={type} type="button" onClick={() => update('type', type as VehiculeType)}
                className={cn(
                  'flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border-2 text-xs sm:text-sm font-semibold transition-all flex-1 justify-center',
                  form.type === type
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300 active:border-gray-400'
                )}
              >
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </div>
        </div>

        {/* Main info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-medium text-gray-700">Marque</label>
            <select
              value={selectedMarque}
              onChange={e => setSelectedMarque(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm bg-white"
            >
              <option value="">Sélectionner une marque</option>
              {BRAND_OPTIONS.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <Input id="modele" label="Modèle" value={form.modele} required
            onChange={e => update('modele', e.target.value)} placeholder="Ex: Passat, 308, GSXF 750..."
            error={errors.modele}
          />
          <Input id="immat" label="Immatriculation" value={form.immatriculation}
            onChange={e => update('immatriculation', e.target.value)} placeholder="Ex: 244 TU 634"
          />
        </div>

        <Textarea
          id="defaut"
          label="Défaut / Travaux à effectuer"
          value={form.defaut}
          required
          rows={2}
          onChange={e => update('defaut', e.target.value)}
          placeholder="Décrire le problème ou les travaux..."
          error={errors.defaut}
        />

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">Type de service</label>
          <select
            value={form.service_type ?? 'diagnostic'}
            onChange={e =>
              update('service_type', e.target.value as VehiculeFormData['service_type'])
            }
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm bg-white"
          >
            <option value="diagnostic">Diagnostic</option>
            <option value="diagnostic_approfondi">Diagnostic approfondi</option>
            <option value="service_rapide">Service rapide</option>
            <option value="reprogrammation">Reprogrammation</option>
            <option value="mecanique">Mécanique</option>
            <option value="autre">Autre</option>
          </select>
        </div>

        {/* Statut + Date d'entrée */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Statut d'entrée <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {ETATS_ENTREE.map(etat => {
                const cfg = ETAT_CONFIG[etat]
                const isSelected = form.etat_initial === etat
                return (
                  <button key={etat} type="button" onClick={() => update('etat_initial', etat)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-2 rounded-lg border-2 text-xs font-bold transition-all',
                      isSelected ? 'scale-[1.02] shadow-md' : 'opacity-60 hover:opacity-90',
                    )}
                    style={{
                      borderColor: cfg.color,
                      backgroundColor: isSelected ? `${cfg.color}15` : 'white',
                      color: cfg.color,
                    }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>
          <Input id="date_entree" label="Date d'entrée" type="date" value={form.date_entree} required
            onChange={e => update('date_entree', e.target.value)}
            error={errors.date_entree}
          />
        </div>

        {/* Assignment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-medium text-gray-700">Techniciens assignés</label>
            <div className="flex flex-wrap gap-2 p-2.5 border border-gray-200 rounded-xl bg-white min-h-[46px]">
              {techniciens.map(t => {
                const selected = form.technicien_ids.includes(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleAssignee('technicien_ids', t.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      selected ? 'bg-orange-600 text-white border-orange-600' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    )}
                  >
                    {t.nom_complet}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs sm:text-sm font-medium text-gray-700">Responsables assignés</label>
            <div className="flex flex-wrap gap-2 p-2.5 border border-gray-200 rounded-xl bg-white min-h-[46px]">
              {responsables.map(r => {
                const selected = form.responsable_ids.includes(r.id)
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleAssignee('responsable_ids', r.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      selected ? 'bg-orange-600 text-white border-orange-600' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    )}
                  >
                    {r.nom_complet}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <Input id="telephone" label="Téléphone client" value={form.client_telephone}
          onChange={e => update('client_telephone', e.target.value)} placeholder="Ex: 98305274"
        />

        <Textarea id="notes" label="Notes" value={form.notes} rows={2}
          onChange={e => update('notes', e.target.value)} placeholder="Informations supplémentaires..."
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="block text-sm font-medium text-gray-700">Photos véhicule (optionnel)</label>
            <span className="text-xs text-gray-500">{pendingImages.length}/{MAX_IMAGES}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={imageCategory}
              onChange={e => setImageCategory(e.target.value as VehiculeImageCategory)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm bg-white"
            >
              {IMAGE_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <Input
              id="image_note"
              label="Note photo"
              value={imageNote}
              onChange={e => setImageNote(e.target.value)}
              placeholder="Ex: rayure aile droite"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
              <Camera className="w-4 h-4" />
              Prendre photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => {
                  void handlePickFiles(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
              <ImagePlus className="w-4 h-4" />
              Depuis galerie
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => {
                  void handlePickFiles(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
          {errors.images && <p className="text-xs text-red-600">{errors.images}</p>}

          {pendingImages.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {pendingImages.map(img => (
                <div key={img.id} className="relative group">
                  <img src={img.previewUrl} alt="Aperçu véhicule" className="w-full h-20 object-cover rounded-lg border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => removePendingImage(img.id)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Supprimer image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - sticky on mobile */}
        <div className="flex gap-2 sm:gap-3 pt-3 border-t border-gray-100 sticky bottom-0 bg-white pb-safe">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 text-xs sm:text-sm">Annuler</Button>
          <Button type="submit" className="flex-1 text-xs sm:text-sm" icon={<Save className="w-4 h-4" />}>
            {isEdit ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
