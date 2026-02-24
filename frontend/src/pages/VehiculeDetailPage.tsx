import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useVehiculesContext } from '@/contexts/VehiculesContext'
import { useToast } from '@/contexts/ToastContext'
import { useNotifications } from '@/contexts/NotificationsContext'
import { mockUsers } from '@/data/mock'
import { ETAT_CONFIG } from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import EtatBadge from '@/components/vehicules/EtatBadge'
import VehiculeTimeline from '@/components/vehicules/VehiculeTimeline'
import VehiculeStats from '@/components/vehicules/VehiculeStats'
import ChangeEtatModal from '@/components/vehicules/ChangeEtatModal'
import VehiculeForm from '@/components/vehicules/VehiculeForm'
import { ArrowLeft, ArrowRightLeft, Pencil, Phone, Calendar, User, Clock, Car, Bike } from 'lucide-react'
import { daysSince, getUserDisplayName, formatDuree } from '@/lib/utils'

export default function VehiculeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, permissions } = useAuth()
  const { getVehicule, getHistorique, changeEtat, editVehicule } = useVehiculesContext()
  const toast = useToast()
  const { addNotification } = useNotifications()

  const [showChangeEtat, setShowChangeEtat] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const vehicule = getVehicule(Number(id))
  const historique = getHistorique(Number(id))

  if (!vehicule || !user || !permissions) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 font-medium">Véhicule non trouvé</p>
        <Button variant="ghost" onClick={() => navigate('/vehicules')} className="mt-4">Retour aux véhicules</Button>
      </div>
    )
  }

  const cfg = ETAT_CONFIG[vehicule.etat_actuel]
  const jours = daysSince(vehicule.date_entree)
  const techName = getUserDisplayName(vehicule.technicien_id, mockUsers)
  const respName = getUserDisplayName(vehicule.responsable_id, mockUsers)

  const canChangeEtat = permissions.canChangeEtat && vehicule.etat_actuel !== 'vert'
    && (permissions.vehiculeVisibility === 'all' || vehicule.technicien_id === user.id)

  const minutesSinceUpdate = Math.round(
    (Date.now() - new Date(vehicule.derniere_mise_a_jour).getTime()) / 60000
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Back */}
      <button onClick={() => navigate('/vehicules')}
        className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 hover:text-gray-700 active:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />Retour
      </button>

      {/* Header card */}
      <Card padding="md">
        <div className="space-y-3 sm:space-y-0 sm:flex sm:items-start sm:justify-between sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${cfg.color}15` }}>
                {vehicule.type === 'moto' ? <Bike className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: cfg.color }} /> : <Car className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: cfg.color }} />}
              </div>
              <h1 className="text-lg sm:text-2xl font-extrabold text-gray-900">{vehicule.modele}</h1>
              <EtatBadge etat={vehicule.etat_actuel} size="lg" />
            </div>
            <p className="text-gray-500 font-mono text-xs sm:text-sm">{vehicule.immatriculation || 'Sans immatriculation'}</p>
            <p className="text-sm sm:text-base font-semibold text-gray-800 mt-1.5 sm:mt-2">{vehicule.defaut}</p>
            {vehicule.notes && <p className="text-xs sm:text-sm text-gray-500 mt-1 italic line-clamp-2">{vehicule.notes}</p>}
          </div>

          {/* Actions - full width on mobile */}
          <div className="flex gap-2 flex-shrink-0">
            {canChangeEtat && (
              <Button onClick={() => setShowChangeEtat(true)} icon={<ArrowRightLeft className="w-4 h-4" />} className="flex-1 sm:flex-none text-xs sm:text-sm">
                Changer l'état
              </Button>
            )}
            {permissions.canEditVehicule && (
              <Button variant="outline" onClick={() => setShowEdit(true)} icon={<Pencil className="w-4 h-4" />} className="flex-1 sm:flex-none text-xs sm:text-sm">
                Modifier
              </Button>
            )}
          </div>
        </div>

        {/* Info grid - 2 columns on mobile */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-100">
          <div>
            <p className="text-[10px] sm:text-xs text-gray-400 mb-0.5 sm:mb-1 flex items-center gap-1"><User className="w-3 h-3" />Technicien</p>
            <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">{techName}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-gray-400 mb-0.5 sm:mb-1 flex items-center gap-1"><User className="w-3 h-3" />Responsable</p>
            <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">{respName}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-gray-400 mb-0.5 sm:mb-1 flex items-center gap-1"><Phone className="w-3 h-3" />Tél. client</p>
            <p className="text-xs sm:text-sm font-semibold text-gray-800">{vehicule.client_telephone || '-'}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-gray-400 mb-0.5 sm:mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" />Date entrée</p>
            <p className="text-xs sm:text-sm font-semibold text-gray-800">{vehicule.date_entree}</p>
          </div>
        </div>

        {/* Duration indicators - stack on small mobile */}
        <div className="flex flex-col xs:flex-row gap-2 sm:gap-4 mt-3 sm:mt-4">
          <div className="bg-gray-50 rounded-xl px-3 sm:px-4 py-2 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
            <span className="text-xs sm:text-sm"><span className="font-bold text-gray-800">{jours}j</span> <span className="text-gray-500">au garage</span></span>
          </div>
          <div className="rounded-xl px-3 sm:px-4 py-2 flex items-center gap-2" style={{ backgroundColor: `${cfg.color}10` }}>
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: cfg.color }} />
            <span className="text-xs sm:text-sm">
              <span className="font-bold" style={{ color: cfg.color }}>{formatDuree(minutesSinceUpdate)}</span>
              <span className="text-gray-500"> en {cfg.label}</span>
            </span>
          </div>
        </div>
      </Card>

      {/* Stats + Timeline - stack on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-1">
          <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-2 sm:mb-3">Statistiques</h2>
          <VehiculeStats historique={historique} dateEntree={vehicule.date_entree} />
        </div>
        <div className="lg:col-span-2">
          <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-2 sm:mb-3">Historique des états</h2>
          <Card padding="sm">
            <VehiculeTimeline historique={historique} />
          </Card>
        </div>
      </div>

      {/* Modals */}
      {showChangeEtat && (
        <ChangeEtatModal vehicule={vehicule}
          onClose={() => setShowChangeEtat(false)}
          onConfirm={(etat, comm, pcs) => {
            changeEtat(vehicule.id, etat, user.id, user.nom_complet, comm, pcs)
            toast.success('État mis à jour avec succès')
            setShowChangeEtat(false)
          }}
        />
      )}
      {showEdit && (
        <VehiculeForm vehicule={vehicule}
          onClose={() => setShowEdit(false)}
          onSubmit={(data) => {
            editVehicule(vehicule.id, data)
            const techId = data.technicien_id
            if (techId) addNotification(techId, `Vous avez été assigné au véhicule ${data.modele ?? vehicule.modele} ${(data.immatriculation ?? vehicule.immatriculation) ? `(${data.immatriculation ?? vehicule.immatriculation})` : ''} - ${data.defaut ?? vehicule.defaut}`)
            toast.success('Véhicule modifié avec succès')
            setShowEdit(false)
          }}
        />
      )}
    </div>
  )
}
