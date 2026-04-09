import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useVehiculesContext } from '@/contexts/VehiculesContext'
import { useUsers } from '@/contexts/UsersContext'
import { useToast } from '@/contexts/ToastContext'
import { useNotifications } from '@/contexts/NotificationsContext'
import { ETAT_CONFIG } from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import EtatBadge from '@/components/vehicules/EtatBadge'
import VehiculeTimeline from '@/components/vehicules/VehiculeTimeline'
import VehiculeStats from '@/components/vehicules/VehiculeStats'
import ChangeEtatModal from '@/components/vehicules/ChangeEtatModal'
import VehiculeForm from '@/components/vehicules/VehiculeForm'
import { ArrowLeft, ArrowRightLeft, Pencil, Phone, Calendar, User, Clock, Car, Bike, Image as ImageIcon, Trash2 } from 'lucide-react'
import { daysSince, getUserDisplayName, formatDuree, formatDate } from '@/lib/utils'

export default function VehiculeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, permissions, getAccessToken } = useAuth()
  const { users } = useUsers()
  const {
    getVehicule,
    getHistorique,
    changeEtat,
    editVehicule,
    fetchVehiculeById,
    fetchVehiculeImages,
    getVehiculeImages,
    uploadVehiculeImage,
    deleteVehiculeImage,
  } = useVehiculesContext()
  const toast = useToast()
  const { addNotification } = useNotifications()

  const [showChangeEtat, setShowChangeEtat] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [currentImageUrl, setCurrentImageUrl] = useState('')

  const vehiculeId = Number(id)
  let vehicule = getVehicule(vehiculeId)
  const historique = getHistorique(vehiculeId)
  const vehiculeImages = getVehiculeImages(vehiculeId)
  const accessToken = getAccessToken()

  useEffect(() => {
    if (isNaN(vehiculeId)) return
    if (!vehicule && fetchVehiculeById) {
      setLoadingDetail(true)
      fetchVehiculeById(vehiculeId).then(() => setLoadingDetail(false))
      return
    }
    if (vehicule && historique.length === 0) void fetchVehiculeById(vehiculeId)
  }, [vehiculeId, vehicule, fetchVehiculeById, historique.length])

  useEffect(() => {
    if (isNaN(vehiculeId)) return
    void fetchVehiculeImages(vehiculeId)
  }, [vehiculeId, fetchVehiculeImages])

  vehicule = getVehicule(vehiculeId)

  if (!user || !permissions) return null
  if (loadingDetail) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 font-medium">Chargement...</p>
      </div>
    )
  }
  if (!vehicule) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 font-medium">Véhicule non trouvé</p>
        <Button variant="ghost" onClick={() => navigate('/vehicules')} className="mt-4">Retour aux véhicules</Button>
      </div>
    )
  }

  const cfg = ETAT_CONFIG[vehicule.etat_actuel]
  const jours = daysSince(vehicule.date_entree)
  const techName = getUserDisplayName(vehicule.technicien_id, users)
  const respName = getUserDisplayName(vehicule.responsable_id, users)

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
            <p className="text-xs sm:text-sm font-semibold text-gray-800">{formatDate(vehicule.date_entree)}</p>
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

      <div>
        <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-orange-500" />
          Photos du véhicule
        </h2>
        <Card padding="sm">
          {vehiculeImages.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune photo enregistrée pour ce véhicule.</p>
          ) : (
            <div key={vehiculeId} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {vehiculeImages.map(img => (
                <div key={img.id} className="rounded-lg border border-gray-100 overflow-hidden bg-white cursor-pointer group">
                  <img
src={`/api${img.url_path}`}
                    alt={img.note || img.original_name || `Photo ${img.id}`}
                    loading="lazy"
                    onClick={() => {
setCurrentImageUrl(`/api${img.url_path}`);
                      setShowImageModal(true);
                    }}
                    className="w-full h-32 md:h-40 object-cover rounded-xl shadow-sm hover:scale-[1.02] transition-transform duration-200 cursor-pointer"
                    title="Cliquez pour agrandir"
                  />
                  <div className="p-2 space-y-1">
                    <p className="text-[11px] text-gray-700 truncate" title={img.note || img.original_name}>
                      {img.note || img.original_name || 'Photo véhicule'}
                    </p>
                    <p className="text-[10px] text-gray-400">{new Date(img.created_at).toLocaleDateString('fr-FR')}</p>
                    {permissions.canEditVehicule && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const ok = await deleteVehiculeImage(vehiculeId, img.id)
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

      {showImageModal && (
        <div 
          className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <button 
            className="absolute top-6 right-6 text-white text-2xl hover:text-gray-300 z-[1001]"
            onClick={() => setShowImageModal(false)}
          >
            ×
          </button>
          <img
            src={currentImageUrl}
            alt="Image plein écran"
            className="max-h-screen max-w-screen object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Modals */}
      {showChangeEtat && (
        <ChangeEtatModal vehicule={vehicule}
          onClose={() => setShowChangeEtat(false)}
          onConfirm={async (etat, comm, pcs) => {
            const ok = await changeEtat(vehicule.id, etat, user.id, user.nom_complet, comm, pcs)
            if (ok) {
              toast.success('État mis à jour avec succès')
              setShowChangeEtat(false)
            } else {
              toast.error('Transition non autorisée')
            }
          }}
        />
      )}
      {showEdit && (
        <VehiculeForm vehicule={vehicule}
          onClose={() => setShowEdit(false)}
          onSubmit={async (data, images) => {
            try {
              await editVehicule(vehicule.id, data)
              if (images.length > 0) {
                let failed = 0
                for (const image of images) {
                  try {
                    await uploadVehiculeImage(vehicule.id, image)
                  } catch {
                    failed += 1
                  }
                }
                await fetchVehiculeImages(vehicule.id)
                if (failed > 0) toast.error(`${failed} photo(s) n'ont pas pu être envoyées.`)
                else toast.success(`${images.length} photo(s) ajoutée(s).`)
              }
              const techId = data.technicien_id
              const respId = data.responsable_id
              if (techId) addNotification(techId, `Vous avez été assigné au véhicule ${data.modele ?? vehicule.modele} ${(data.immatriculation ?? vehicule.immatriculation) ? `(${data.immatriculation ?? vehicule.immatriculation})` : ''} - ${data.defaut ?? vehicule.defaut}`)
              if (respId && respId !== techId) addNotification(respId, `Vous avez été assigné en tant que responsable au véhicule ${data.modele ?? vehicule.modele} ${(data.immatriculation ?? vehicule.immatriculation) ? `(${data.immatriculation ?? vehicule.immatriculation})` : ''} - ${data.defaut ?? vehicule.defaut}`)
              toast.success('Véhicule modifié avec succès')
              setShowEdit(false)
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Erreur')
            }
          }}
        />
      )}
    </div>
  )
}
