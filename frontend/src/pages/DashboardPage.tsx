import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useVehiculesContext } from '@/contexts/VehiculesContext'
import { useUsers } from '@/contexts/UsersContext'
import { ETAT_CONFIG, type EtatVehicule } from '@/types'
import Card from '@/components/ui/Card'
import { Car, AlertTriangle, Clock, CheckCircle, Users, ArrowRight } from 'lucide-react'
import { daysSince } from '@/lib/utils'

export default function DashboardPage() {
  const { user, permissions } = useAuth()
  const { vehicules, historique, stats, dashboardSummary } = useVehiculesContext()
  const { users } = useUsers()
  const navigate = useNavigate()
  if (!user || !permissions) return null

  const isGlobalView = permissions.vehiculeVisibility === 'all'
  const myVehicules = permissions.vehiculeVisibility === 'all'
    ? vehicules
    : permissions.vehiculeVisibility === 'own'
      ? vehicules.filter(v => v.technicien_id === user.id)
      : []
  const totalVehicules = isGlobalView ? (stats?.total ?? myVehicules.length) : myVehicules.length

  const countByEtat = (etat: EtatVehicule) =>
    isGlobalView ? (stats?.byEtat?.[etat] ?? 0) : myVehicules.filter(v => v.etat_actuel === etat).length
  const urgents = isGlobalView
    ? (dashboardSummary?.urgents ?? [])
    : myVehicules.filter(v => v.etat_actuel === 'rouge')
  const anciens = isGlobalView
    ? (dashboardSummary?.anciens ?? [])
    : myVehicules.filter(v => daysSince(v.date_entree) > 7 && v.etat_actuel !== 'vert')
  const problemsCount = isGlobalView ? (dashboardSummary?.problemsCount ?? urgents.length) : urgents.length

  const recentActivity = isGlobalView
    ? (dashboardSummary?.recentActivity ?? []).slice(0, 6)
    : [...historique]
        .sort((a, b) => new Date(b.date_changement).getTime() - new Date(a.date_changement).getTime())
        .slice(0, 6)

  const etats: EtatVehicule[] = ['orange', 'mauve', 'bleu', 'rouge', 'vert', 'retour']

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          {permissions.vehiculeVisibility === 'own' ? `Mes véhicules` : 'Dashboard'}
        </h1>
        <p className="text-gray-500 mt-0.5 text-sm">
          {permissions.vehiculeVisibility === 'own'
            ? `Bonjour ${user.nom_complet}, ${myVehicules.length} véhicule(s) assigné(s)`
            : `Bienvenue ${user.nom_complet} — Vue d'ensemble`}
        </p>
      </div>

      {/* Counters by color - scrollable on mobile */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 sm:pb-0 sm:grid sm:grid-cols-3 lg:grid-cols-5 sm:overflow-visible -mx-4 px-4 sm:mx-0 sm:px-0">
        {etats.map(etat => {
          const cfg = ETAT_CONFIG[etat]
          const count = countByEtat(etat)
          return (
            <button key={etat} onClick={() => navigate(`/vehicules?etat=${etat}`)}
              className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100 hover:shadow-md active:scale-95 transition-all text-left group min-w-[120px] flex-shrink-0 sm:min-w-0"
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">{cfg.label}</span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold" style={{ color: cfg.color }}>{count}</p>
            </button>
          )
        })}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card padding="sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Car className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-extrabold text-gray-900">{totalVehicules}</p>
              <p className="text-[10px] sm:text-sm text-gray-500 truncate">{permissions.vehiculeVisibility === 'all' ? 'Total' : 'Mes véh.'}</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-extrabold text-gray-900">{problemsCount}</p>
              <p className="text-[10px] sm:text-sm text-gray-500">Problèmes</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-extrabold text-gray-900">{countByEtat('vert')}</p>
              <p className="text-[10px] sm:text-sm text-gray-500">Validés</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Alerts */}
        <Card>
          <div
            className="flex items-center justify-between mb-3 cursor-pointer select-none hover:text-red-600"
            onClick={() => navigate('/vehicules')}
          >
            <h2 className="text-sm sm:text-base font-bold">Alertes</h2>
            <AlertTriangle className="w-4 h-4 text-gray-400" />
          </div>
          <div className="space-y-2">
            {urgents.length === 0 && anciens.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">Aucune alerte</p>
            )}
            {urgents.map(v => (
              <button key={`r-${v.id}`} onClick={() => navigate(`/vehicules/${v.id}`)}
                className="w-full flex items-center gap-2.5 bg-red-50 rounded-xl px-3 py-2.5 text-left hover:bg-red-100 active:bg-red-200 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-800 truncate">{v.modele} — {v.defaut}</p>
                  <p className="text-xs text-red-600">{v.immatriculation || 'Sans immat.'} · {daysSince(v.date_entree)}j</p>
                </div>
                <ArrowRight className="w-4 h-4 text-red-400 flex-shrink-0" />
              </button>
            ))}
            {anciens.filter(v => v.etat_actuel !== 'rouge').slice(0, 3).map(v => (
              <button key={`a-${v.id}`} onClick={() => navigate(`/vehicules/${v.id}`)}
                className="w-full flex items-center gap-2.5 bg-orange-50 rounded-xl px-3 py-2.5 text-left hover:bg-orange-100 active:bg-orange-200 transition-colors"
              >
                <Clock className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-orange-800 truncate">{v.modele} — {daysSince(v.date_entree)}j</p>
                  <p className="text-xs text-orange-600">{ETAT_CONFIG[v.etat_actuel].label}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Recent activity */}
        <Card>
          <div
            className="flex items-center justify-between mb-3 cursor-pointer select-none hover:text-indigo-600"
            onClick={() => navigate('/vehicules')}
          >
            <h2 className="text-sm sm:text-base font-bold">Activité récente</h2>
            <Clock className="w-4 h-4 text-gray-400" />
          </div>
          <div className="space-y-2.5">
            {recentActivity.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">Aucune activité</p>
            )}
            {recentActivity.map(h => {
              const cfg = ETAT_CONFIG[h.etat_nouveau]
              const v = vehicules.find(vv => vv.id === h.vehicule_id)
              return (
                <div key={h.id} className="flex items-start gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">
                      <span className="font-semibold">{h.utilisateur_nom}</span>
                      {' → '}
                      <span className="font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                      {(isGlobalView ? (h as typeof h & { vehicleModel?: string }).vehicleModel : v?.modele) && (
                        <span className="text-gray-500"> · {isGlobalView ? (h as typeof h & { vehicleModel?: string }).vehicleModel : v?.modele}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{h.commentaire}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Team */}
      {permissions.canManageUsers && (
        <Card>
          <div
            className="flex items-center justify-between mb-3 cursor-pointer select-none hover:text-violet-600"
            onClick={() => navigate('/equipe/membres')}
          >
            <h2 className="text-sm sm:text-base font-bold">Équipe</h2>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
            {users.filter(u => u.statut === 'actif' && u.role === 'technicien').map(tech => {
              const assignedCount = isGlobalView
                ? (dashboardSummary?.teamLoadByTechnicien?.[String(tech.id)] ?? 0)
                : vehicules.filter(v => v.technicien_id === tech.id && v.etat_actuel !== 'vert').length
              return (
                <div key={tech.id} className="bg-gray-50 rounded-xl p-2.5 sm:p-3 text-center">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-1.5 text-xs sm:text-sm font-bold text-gray-600">
                    {tech.nom_complet.charAt(0)}
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">{tech.nom_complet}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">{assignedCount} véh.</p>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
