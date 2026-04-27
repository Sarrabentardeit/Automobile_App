import { useNavigate } from 'react-router-dom'
import { ETAT_CONFIG, type Vehicule } from '@/types'
import { useUsers } from '@/contexts/UsersContext'
import EtatBadge from './EtatBadge'
import { Phone, Calendar, ArrowRightLeft, Eye, Pencil, Clock, Trash2, Wallet, ClipboardList } from 'lucide-react'
import { daysSince, getUserDisplayName, formatDuree, formatDate } from '@/lib/utils'
import type { Permissions } from '@/types'

interface Props {
  vehicule: Vehicule
  permissions: Permissions
  onChangeEtat: () => void
  onEdit: () => void
  onFicheFinanciere: () => void
  onDelete?: () => void
  allowChangeEtatWhenValidated?: boolean
}

export default function VehiculeCard({
  vehicule: v,
  permissions,
  onChangeEtat,
  onEdit,
  onFicheFinanciere,
  onDelete,
  allowChangeEtatWhenValidated = false,
}: Props) {
  const navigate = useNavigate()
  const { users } = useUsers()
  const cfg = ETAT_CONFIG[v.etat_actuel]
  const jours = daysSince(v.date_entree)
  const techName = getUserDisplayName(v.technicien_id, users)
  const respName = getUserDisplayName(v.responsable_id, users)

  const minutesSinceUpdate = Math.round(
    (Date.now() - new Date(v.derniere_mise_a_jour).getTime()) / 60000
  )

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group active:shadow-md">
      <div className="flex">
        {/* Color bar */}
        <div className="w-1 sm:w-1.5 flex-shrink-0" style={{ backgroundColor: cfg.color }} />

        <div className="flex-1 p-3 sm:p-4 md:p-5 min-w-0">
          {/* Top row: model + badge + actions */}
          <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">{v.modele}</h3>
                <EtatBadge etat={v.etat_actuel} />
              </div>
              <p className="text-xs sm:text-sm text-gray-500 font-mono mt-0.5 truncate">
                {v.immatriculation || 'Sans immatriculation'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {permissions.canChangeEtat && (v.etat_actuel !== 'vert' || allowChangeEtatWhenValidated) && (
                <button onClick={onChangeEtat} title="Changer l'état"
                  className="p-1.5 sm:p-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 active:bg-orange-200 transition-colors"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
              <button
                onClick={onFicheFinanciere}
                title="Fiche financière (dépenses, avance, reste)"
                className="p-1.5 sm:p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200 transition-colors"
              >
                <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  navigate(`/vehicules/${v.id}#ordre-reparation`)
                }}
                title="Ordre de réparation (fiche d'entrée atelier)"
                className="p-1.5 sm:p-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:bg-indigo-200 transition-colors"
              >
                <ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              {permissions.canEditVehicule && (
                <button onClick={onEdit} title="Modifier"
                  className="p-1.5 sm:p-2 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
              {onDelete && (
                <button onClick={onDelete} title="Supprimer"
                  className="p-1.5 sm:p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
              <button onClick={() => navigate(`/vehicules/${v.id}`)} title="Voir détails"
                className="p-1.5 sm:p-2 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors"
              >
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          {/* Defaut */}
          <p className="text-xs sm:text-sm font-medium text-gray-800 mb-2 sm:mb-3 line-clamp-2">{v.defaut}</p>

          {/* Info grid - compact on mobile */}
          <div className="flex flex-wrap gap-x-3 sm:gap-x-5 gap-y-1 text-[10px] sm:text-xs text-gray-500">
            {techName !== '-' && (
              <span><span className="text-gray-400">Tech:</span> <span className="font-medium text-gray-700">{techName}</span></span>
            )}
            {respName !== '-' && (
              <span className="hidden sm:inline"><span className="text-gray-400">Resp:</span> <span className="font-medium text-gray-700">{respName}</span></span>
            )}
            {v.client_telephone && (
              <span className="hidden sm:inline-flex items-center gap-1"><Phone className="w-3 h-3" />{v.client_telephone}</span>
            )}
            <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(v.date_entree)}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span className="font-medium" style={{ color: jours > 7 ? '#ef4444' : undefined }}>
                {jours}j
              </span>
            </span>
            <span className="inline-flex items-center gap-1" style={{ color: cfg.color }}>
              <Clock className="w-3 h-3" />
              {formatDuree(minutesSinceUpdate)} en {cfg.label}
            </span>
          </div>

          {v.notes && (
            <p className="text-[10px] sm:text-xs text-gray-400 mt-1.5 sm:mt-2 italic truncate">Note: {v.notes}</p>
          )}
        </div>
      </div>
    </div>
  )
}
