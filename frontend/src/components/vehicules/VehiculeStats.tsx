import { ETAT_CONFIG, type EtatVehicule, type HistoriqueEtat } from '@/types'
import { formatDuree, parseDateOnly } from '@/lib/utils'
import Card from '@/components/ui/Card'
import { Clock, ArrowRightLeft, Timer } from 'lucide-react'

interface Props { historique: HistoriqueEtat[]; dateEntree: string }

export default function VehiculeStats({ historique, dateEntree }: Props) {
  const sorted = [...historique].sort(
    (a, b) => new Date(a.date_changement).getTime() - new Date(b.date_changement).getTime()
  )
  const startTime =
    sorted.length > 0
      ? new Date(sorted[0].date_changement).getTime()
      : parseDateOnly(dateEntree).getTime()
  const totalMinutes = Math.max(0, Math.round((Date.now() - startTime) / 60000))

  const timeByEtat: Partial<Record<EtatVehicule, number>> = {}
  historique.forEach(h => {
    if (h.etat_precedent && h.duree_etat_precedent_minutes) {
      timeByEtat[h.etat_precedent] = (timeByEtat[h.etat_precedent] || 0) + h.duree_etat_precedent_minutes
    }
  })

  const etats = Object.entries(timeByEtat).sort(([, a], [, b]) => b - a) as [EtatVehicule, number][]
  const transitions = historique.length
  const longestEtat = etats.length > 0 ? etats[0] : null

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card padding="sm">
          <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
            <span className="text-[10px] sm:text-xs text-gray-500 font-medium">Total</span>
          </div>
          <p className="text-sm sm:text-lg font-extrabold text-gray-900">{formatDuree(totalMinutes)}</p>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
            <ArrowRightLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
            <span className="text-[10px] sm:text-xs text-gray-500 font-medium">Transitions</span>
          </div>
          <p className="text-sm sm:text-lg font-extrabold text-gray-900">{transitions}</p>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
            <Timer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
            <span className="text-[10px] sm:text-xs text-gray-500 font-medium">Plus long</span>
          </div>
          {longestEtat ? (
            <p className="text-sm sm:text-lg font-extrabold" style={{ color: ETAT_CONFIG[longestEtat[0]].color }}>
              {formatDuree(longestEtat[1])}
            </p>
          ) : (
            <p className="text-sm sm:text-lg font-extrabold text-gray-300">-</p>
          )}
        </Card>
      </div>

      {/* Time distribution bar */}
      {etats.length > 0 && (
        <Card padding="sm">
          <p className="text-xs sm:text-sm font-bold text-gray-900 mb-2 sm:mb-3">Répartition du temps</p>
          {/* Stacked bar */}
          <div className="h-4 sm:h-6 rounded-full overflow-hidden flex bg-gray-100 mb-3 sm:mb-4">
            {etats.map(([etat, mins]) => {
              const pct = totalMinutes > 0 ? (mins / totalMinutes) * 100 : 0
              if (pct < 1) return null
              return (
                <div key={etat} style={{ width: `${pct}%`, backgroundColor: ETAT_CONFIG[etat].color }}
                  className="h-full transition-all" title={`${ETAT_CONFIG[etat].label}: ${formatDuree(mins)}`} />
              )
            })}
          </div>
          {/* Legend */}
          <div className="space-y-1.5 sm:space-y-2">
            {etats.map(([etat, mins]) => {
              const cfg = ETAT_CONFIG[etat]
              const pct = totalMinutes > 0 ? Math.round((mins / totalMinutes) * 100) : 0
              return (
                <div key={etat} className="flex items-center gap-2 sm:gap-3">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                  <span className="text-[10px] sm:text-sm font-medium text-gray-700 w-16 sm:w-24 truncate">{cfg.label}</span>
                  <div className="flex-1 h-1.5 sm:h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-gray-600 w-12 sm:w-16 text-right">{formatDuree(mins)}</span>
                  <span className="text-[10px] sm:text-xs text-gray-400 w-8 sm:w-10 text-right">{pct}%</span>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
