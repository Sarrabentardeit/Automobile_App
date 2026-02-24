import { ETAT_CONFIG, type EtatVehicule, type HistoriqueEtat } from '@/types'
import { formatDateTime, formatDuree } from '@/lib/utils'
import { Clock, User, MessageSquare, Wrench, ArrowRight } from 'lucide-react'
import EtatBadge from './EtatBadge'

interface Props { historique: HistoriqueEtat[] }

export default function VehiculeTimeline({ historique }: Props) {
  if (historique.length === 0) {
    return (
      <div className="text-center py-8 sm:py-10">
        <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-gray-200 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">Aucun historique disponible</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="absolute left-[15px] sm:left-[19px] top-4 bottom-4 w-0.5 bg-gray-200" />

      <div className="space-y-3 sm:space-y-5">
        {historique.map((entry, idx) => {
          const cfg = ETAT_CONFIG[entry.etat_nouveau]
          return (
            <div key={entry.id} className="relative flex gap-2.5 sm:gap-4">
              {/* Dot */}
              <div className="relative z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 border-[3px] sm:border-4 border-white shadow-md"
                style={{ backgroundColor: cfg.color }}
              >
                <span className="text-white text-[10px] sm:text-xs font-bold">{idx + 1}</span>
              </div>

              {/* Content */}
              <div className="flex-1 bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-100 min-w-0">
                {/* Transition badges */}
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 flex-wrap">
                  {entry.etat_precedent && (
                    <>
                      <EtatBadge etat={entry.etat_precedent as EtatVehicule} size="sm" />
                      <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" />
                    </>
                  )}
                  <EtatBadge etat={entry.etat_nouveau} size="sm" />
                  {entry.duree_etat_precedent_minutes !== null && (
                    <span className="text-[9px] sm:text-[10px] font-semibold bg-gray-200 text-gray-600 px-1.5 sm:px-2 py-0.5 rounded-full ml-0.5">
                      {formatDuree(entry.duree_etat_precedent_minutes)}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-1 sm:space-y-1.5 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600">
                    <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="font-medium truncate">{formatDateTime(entry.date_changement)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600">
                    <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="font-semibold text-gray-800">{entry.utilisateur_nom}</span>
                  </div>
                  <div className="flex items-start gap-1.5 sm:gap-2 text-gray-600">
                    <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="break-words">{entry.commentaire}</span>
                  </div>
                  {entry.pieces_utilisees && (
                    <div className="flex items-start gap-1.5 sm:gap-2 text-gray-600">
                      <Wrench className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span className="font-medium break-words">{entry.pieces_utilisees}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
