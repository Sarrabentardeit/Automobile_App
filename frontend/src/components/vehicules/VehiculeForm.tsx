import { useState } from 'react'
import type { Vehicule, VehiculeFormData, VehiculeType, EtatVehicule } from '@/types'
import { ETAT_CONFIG } from '@/types'
import { mockUsers } from '@/data/mock'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import { Save, Car, Bike } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  vehicule: Vehicule | null
  onClose: () => void
  onSubmit: (data: VehiculeFormData) => void
}

const today = () => new Date().toISOString().split('T')[0]

const ETATS_ENTREE: EtatVehicule[] = ['orange', 'mauve', 'bleu', 'rouge', 'vert']

export default function VehiculeForm({ vehicule, onClose, onSubmit }: Props) {
  const isEdit = !!vehicule
  const [form, setForm] = useState<VehiculeFormData>({
    modele: vehicule?.modele ?? '',
    immatriculation: vehicule?.immatriculation ?? '',
    type: vehicule?.type ?? 'voiture',
    etat_initial: vehicule?.etat_actuel ?? 'orange',
    date_entree: vehicule?.date_entree ?? today(),
    defaut: vehicule?.defaut ?? '',
    technicien_id: vehicule?.technicien_id ?? null,
    responsable_id: vehicule?.responsable_id ?? null,
    client_telephone: vehicule?.client_telephone ?? '',
    notes: vehicule?.notes ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const techniciens = mockUsers.filter(u => u.statut === 'actif' && u.permissions.canChangeEtat && u.permissions.vehiculeVisibility === 'own')
  const responsables = mockUsers.filter(u => u.statut === 'actif' && u.permissions.canAssignTechnicien)

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
    onSubmit(form)
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input id="modele" label="Modèle" value={form.modele} required
            onChange={e => update('modele', e.target.value)} placeholder="Ex: PASSAT, 308, GSXF 750..."
            error={errors.modele}
          />
          <Input id="immat" label="Immatriculation" value={form.immatriculation}
            onChange={e => update('immatriculation', e.target.value)} placeholder="Ex: 244 TU 634"
          />
        </div>

        <Textarea id="defaut" label="Défaut / Travaux à effectuer" value={form.defaut} required rows={2}
          onChange={e => update('defaut', e.target.value)} placeholder="Décrire le problème ou les travaux..."
          error={errors.defaut}
        />

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
          <Select id="technicien" label="Technicien assigné" placeholder="-- Choisir un technicien --"
            value={form.technicien_id?.toString() ?? ''}
            onChange={e => update('technicien_id', e.target.value ? Number(e.target.value) : null)}
            options={techniciens.map(t => ({ value: t.id.toString(), label: t.nom_complet }))}
          />
          <Select id="responsable" label="Responsable" placeholder="-- Choisir un responsable --"
            value={form.responsable_id?.toString() ?? ''}
            onChange={e => update('responsable_id', e.target.value ? Number(e.target.value) : null)}
            options={responsables.map(r => ({ value: r.id.toString(), label: r.nom_complet }))}
          />
        </div>

        <Input id="telephone" label="Téléphone client" value={form.client_telephone}
          onChange={e => update('client_telephone', e.target.value)} placeholder="Ex: 98305274"
        />

        <Textarea id="notes" label="Notes" value={form.notes} rows={2}
          onChange={e => update('notes', e.target.value)} placeholder="Informations supplémentaires..."
        />

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
