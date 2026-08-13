import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Car, AlertTriangle, CheckCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useVehiculesContext } from '@/contexts/VehiculesContext'
import { ETAT_CONFIG, type EtatVehicule } from '@/types'
import Card from '@/components/ui/Card'

const ETATS: EtatVehicule[] = [
  'orange',
  'mauve',
  'attente_client',
  'bleu',
  'rouge',
  'remise_cle',
  'vert',
  'retour',
]

function labelEtat(etat: EtatVehicule) {
  return etat === 'rouge' ? 'À RÉSOUDRE' : ETAT_CONFIG[etat].label
}

type Props = {
  /** Titre de section (défaut: Stock global) */
  title?: string
}

export default function StockGlobalPanel({ title = 'Stock global atelier' }: Props) {
  const navigate = useNavigate()
  const { permissions } = useAuth()
  const { stats, fetchStats, dashboardSummary, fetchDashboardSummary } = useVehiculesContext()

  useEffect(() => {
    // TTL côté hook : évite un 2e aller-retour si Dashboard vient de charger
    void fetchStats()
    void fetchDashboardSummary()
  }, [fetchStats, fetchDashboardSummary])

  const countByEtat = (etat: EtatVehicule) => stats?.byEtat?.[etat] ?? 0
  const total = stats?.total ?? 0
  const problems =
    dashboardSummary?.problemsCount ?? countByEtat('rouge')
  const valides = countByEtat('vert')

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-orange-50/40 flex items-center justify-between gap-3">
        <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">{title}</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
          Live
        </span>
      </div>
      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex gap-2.5 overflow-x-auto pb-1 sm:pb-0 sm:grid sm:grid-cols-4 lg:grid-cols-8 sm:overflow-visible -mx-1 px-1 sm:mx-0 sm:px-0">
          {ETATS.map(etat => {
            const cfg = ETAT_CONFIG[etat]
            const count = countByEtat(etat)
            return (
              <button
                key={etat}
                type="button"
                onClick={() => navigate(`/vehicules?etat=${etat}`)}
                className="rounded-2xl p-3 text-left border border-slate-100 bg-gradient-to-b from-white to-slate-50/80 hover:shadow-md hover:border-slate-200 hover:-translate-y-0.5 active:translate-y-0 transition-all min-w-[104px] flex-shrink-0 sm:min-w-0"
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: cfg.color }} />
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate">
                    {labelEtat(etat)}
                  </span>
                </div>
                <p
                  className="text-xl sm:text-2xl font-extrabold tabular-nums tracking-tight"
                  style={{ color: cfg.color }}
                >
                  {count}
                </p>
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Card padding="sm" className="!shadow-none border border-gray-100">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Car className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{total}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                  {permissions?.vehiculeVisibility === 'own' ? 'Mes véhicules' : 'Total'}
                </p>
              </div>
            </div>
          </Card>
          <Card padding="sm" className="!shadow-none border border-gray-100">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-red-600">{problems}</p>
                <p className="text-[10px] sm:text-xs text-gray-500">À résoudre</p>
              </div>
            </div>
          </Card>
          <Card padding="sm" className="!shadow-none border border-gray-100">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-green-600">{valides}</p>
                <p className="text-[10px] sm:text-xs text-gray-500">Validés</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}
