import { useState } from 'react'
import { ETAT_CONFIG, TRANSITIONS_AUTORISEES, type EtatVehicule, type Vehicule } from '@/types'
import Modal from '@/components/ui/Modal'
import Textarea from '@/components/ui/Textarea'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import EtatBadge from './EtatBadge'
import { ArrowRight, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  vehicule: Vehicule
  onClose: () => void
  onConfirm: (nouvelEtat: EtatVehicule, commentaire: string, pieces: string) => void
}

export default function ChangeEtatModal({ vehicule, onClose, onConfirm }: Props) {
  const [selected, setSelected] = useState<EtatVehicule | null>(null)
  const [commentaire, setCommentaire] = useState('')
  const [pieces, setPieces] = useState('')
  const [step, setStep] = useState<'select' | 'confirm'>('select')
  const [error, setError] = useState('')

  const transitions = TRANSITIONS_AUTORISEES[vehicule.etat_actuel]

  const handleNext = () => {
    if (!selected) return setError('Choisissez un nouvel état')
    setError('')
    setStep('confirm')
  }

  const handleConfirm = () => {
    if (!selected) return
    onConfirm(selected, commentaire, pieces)
  }

  if (transitions.length === 0) {
    return (
      <Modal open onClose={onClose} title="Véhicule validé" subtitle={`${vehicule.modele} - ${vehicule.immatriculation}`}>
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-gray-700 font-medium">Ce véhicule est validé (VERT).</p>
          <p className="text-sm text-gray-500 mt-1">Il est prêt pour la remise des clés au client.</p>
          <Button variant="secondary" onClick={onClose} className="mt-6">Fermer</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open onClose={onClose}
      title={step === 'confirm' ? 'Confirmer le changement' : "Changer l'état"}
      subtitle={`${vehicule.modele} — ${vehicule.immatriculation || 'Sans immat.'}`}
    >
      {step === 'select' ? (
        <div className="space-y-4 sm:space-y-5">
          {/* Current state */}
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1.5">État actuel</p>
            <EtatBadge etat={vehicule.etat_actuel} size="lg" />
          </div>

          {/* Transition options */}
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1.5">Nouvel état</p>
            <div className="grid grid-cols-1 gap-2">
              {transitions.map(etat => {
                const cfg = ETAT_CONFIG[etat]
                const isSel = selected === etat
                return (
                  <button key={etat} type="button" onClick={() => { setSelected(etat); setError('') }}
                    className={cn(
                      'p-3 sm:p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98]',
                      isSel ? 'shadow-lg scale-[1.02]' : 'border-gray-200 hover:border-gray-300',
                    )}
                    style={isSel ? { borderColor: cfg.color, backgroundColor: `${cfg.color}10` } : {}}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: cfg.color, backgroundColor: isSel ? cfg.color : 'transparent' }}
                      >
                        {isSel && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="font-bold text-xs sm:text-sm" style={{ color: cfg.color }}>{cfg.label}</span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 ml-7">{cfg.description}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Comment */}
          <Textarea id="commentaire" label="Commentaire" rows={2}
            value={commentaire} onChange={e => { setCommentaire(e.target.value); setError('') }}
            placeholder="Justification du changement..."
          />

          {/* Parts */}
          <Input id="pieces" label="Pièces utilisées (optionnel)"
            value={pieces} onChange={e => setPieces(e.target.value)}
            placeholder="Ex: Rotules AV, filtre à huile..."
          />

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 text-xs sm:text-sm font-medium px-3 py-2.5 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          <div className="flex gap-2 sm:gap-3 pt-2 sticky bottom-0 bg-white">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 text-xs sm:text-sm">Annuler</Button>
            <Button type="button" onClick={handleNext} className="flex-1 text-xs sm:text-sm"
              icon={<ArrowRight className="w-4 h-4" />}>Suivant</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {/* Preview */}
          <div className="bg-gray-50 rounded-xl p-3 sm:p-5 space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3 justify-center flex-wrap">
              <EtatBadge etat={vehicule.etat_actuel} size="lg" />
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <EtatBadge etat={selected!} size="lg" />
            </div>
            <div className="text-xs sm:text-sm space-y-1.5 sm:space-y-2">
              <div><span className="text-gray-500">Véhicule:</span> <span className="font-semibold">{vehicule.modele}</span></div>
              <div><span className="text-gray-500">Commentaire:</span> <span className="font-medium">{commentaire}</span></div>
              {pieces && <div><span className="text-gray-500">Pièces:</span> <span className="font-medium">{pieces}</span></div>}
            </div>
          </div>

          <div className="flex gap-2 sm:gap-3 sticky bottom-0 bg-white">
            <Button type="button" variant="outline" onClick={() => setStep('select')} className="flex-1 text-xs sm:text-sm">Retour</Button>
            <Button type="button" onClick={handleConfirm} className="flex-1 text-xs sm:text-sm"
              icon={<Check className="w-4 h-4" />}>Confirmer</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
