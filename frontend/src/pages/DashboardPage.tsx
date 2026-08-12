import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useVehiculesContext } from '@/contexts/VehiculesContext'
import { useUsers } from '@/contexts/UsersContext'
import { ETAT_CONFIG, type EtatVehicule, type Vehicule } from '@/types'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import DashboardMonthlyStats from '@/components/dashboard/DashboardMonthlyStats'
import DashboardInsights, { DashboardAlertsPanel } from '@/components/dashboard/DashboardInsights'
import DashboardTodayStrip from '@/components/dashboard/DashboardTodayStrip'
import { AlertTriangle, Clock, Users, ArrowRight, LayoutDashboard } from 'lucide-react'
import { daysSince, getActiveEquipeUsers, cn, stripVehiculeAssigneesMeta } from '@/lib/utils'
import { apiFetch } from '@/lib/api'

const ETATS_ACTIFS: EtatVehicule[] = [
  'orange',
  'mauve',
  'attente_client',
  'bleu',
  'rouge',
  'remise_cle',
  'retour',
]

type TeamMemberDetail = {
  id: number
  nom: string
  role: string
  total: number
  byEtat: Record<string, number>
  urgents: number
}

function isAssignedTo(v: {
  technicien_id: number | null
  responsable_id?: number | null
  technicien_ids?: number[]
  responsable_ids?: number[]
}, userId: number) {
  return (
    v.technicien_id === userId ||
    v.responsable_id === userId ||
    (v.technicien_ids ?? []).includes(userId) ||
    (v.responsable_ids ?? []).includes(userId)
  )
}

export default function DashboardPage() {
  const { user, permissions, getAccessToken } = useAuth()
  const { vehicules, dashboardSummary, fetchDashboardSummary, fetchStats } = useVehiculesContext()
  const { users } = useUsers()
  const navigate = useNavigate()
  const [selectedMember, setSelectedMember] = useState<TeamMemberDetail | null>(null)
  const [memberVehicles, setMemberVehicles] = useState<Vehicule[]>([])
  const [memberVehiclesLoading, setMemberVehiclesLoading] = useState(false)

  const isGlobalView = permissions?.vehiculeVisibility === 'all'
  const myVehicules = useMemo(() => {
    if (!user || !permissions) return []
    if (permissions.vehiculeVisibility === 'all') return vehicules
    if (permissions.vehiculeVisibility === 'own') {
      return vehicules.filter(v => isAssignedTo(v, user.id))
    }
    return []
  }, [user, permissions, vehicules])

  const equipeUsers = useMemo(() => getActiveEquipeUsers(users ?? []), [users])

  const teamRows = useMemo(() => {
    return equipeUsers
      .map(tech => {
        const detail = dashboardSummary?.teamLoadDetailByTechnicien?.[String(tech.id)]
        const activeVehicules = myVehicules.filter(
          v => v.etat_actuel !== 'vert' && isAssignedTo(v, tech.id)
        )
        const total = isGlobalView
          ? (dashboardSummary?.teamLoadByTechnicien?.[String(tech.id)] ?? detail?.total ?? 0)
          : activeVehicules.length
        const byEtat = isGlobalView
          ? (detail?.byEtat ?? {})
          : activeVehicules.reduce<Record<string, number>>((acc, v) => {
              acc[v.etat_actuel] = (acc[v.etat_actuel] ?? 0) + 1
              return acc
            }, {})
        const urgentsCount = isGlobalView
          ? (detail?.urgents ?? 0)
          : activeVehicules.filter(v => v.etat_actuel === 'rouge').length
        return {
          id: tech.id,
          nom: tech.nom_complet,
          role: tech.role,
          total,
          byEtat,
          urgents: urgentsCount,
        } satisfies TeamMemberDetail
      })
      .sort((a, b) => b.total - a.total || a.nom.localeCompare(b.nom, 'fr'))
  }, [equipeUsers, dashboardSummary, isGlobalView, myVehicules])

  useEffect(() => {
    void fetchDashboardSummary()
    void fetchStats()
    const id = window.setInterval(() => {
      void fetchDashboardSummary()
      void fetchStats()
    }, 45_000)
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        void fetchDashboardSummary()
        void fetchStats()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [fetchDashboardSummary, fetchStats])

  useEffect(() => {
    if (!selectedMember) return
    const fresh = teamRows.find(r => r.id === selectedMember.id)
    if (fresh) setSelectedMember(fresh)
  }, [teamRows]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedMember) {
      setMemberVehicles([])
      return
    }
    const token = getAccessToken()
    if (!token) return
    let cancelled = false
    setMemberVehiclesLoading(true)
    void (async () => {
      try {
        const res = await apiFetch<{ data: Vehicule[] }>('/vehicules', {
          token,
          params: {
            technicien_id: selectedMember.id,
            exclude_etat: 'vert',
            page: 1,
            limit: 50,
          },
        })
        if (!cancelled) setMemberVehicles(Array.isArray(res.data) ? res.data : [])
      } catch {
        if (!cancelled) {
          setMemberVehicles(
            myVehicules.filter(v => v.etat_actuel !== 'vert' && isAssignedTo(v, selectedMember.id))
          )
        }
      } finally {
        if (!cancelled) setMemberVehiclesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedMember?.id, getAccessToken, myVehicules]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!user || !permissions) return null

  const urgents = isGlobalView
    ? (dashboardSummary?.urgents ?? [])
    : myVehicules.filter(v => v.etat_actuel === 'rouge')
  const anciens = isGlobalView
    ? (dashboardSummary?.anciens ?? [])
    : myVehicules.filter(v => daysSince(v.date_entree) > 7 && v.etat_actuel !== 'vert')

  const recentActivity = (dashboardSummary?.recentActivity ?? []).slice(0, 6)

  const labelEtatDashboard = (etat: EtatVehicule) =>
    etat === 'rouge' ? 'À RÉSOUDRE' : ETAT_CONFIG[etat].label

  const maxLoad = Math.max(1, ...teamRows.map(r => r.total))

  const openMember = (row: TeamMemberDetail) => {
    setSelectedMember(row)
  }

  const closeMember = () => {
    setSelectedMember(null)
    setMemberVehicles([])
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-orange-500" />
            {permissions.vehiculeVisibility === 'own' ? `Mes véhicules` : 'Dashboard'}
          </h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            {permissions.vehiculeVisibility === 'own'
              ? `Bonjour ${user.nom_complet}`
              : `Bienvenue ${user.nom_complet}`}
          </p>
        </div>
        {permissions.canManageUsers ? (
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-gray-200 bg-white px-3 py-1.5 rounded-lg"
          >
            Stock global → Statistiques
          </button>
        ) : null}
      </div>

      <DashboardInsights showAlerts={false} />

      <DashboardTodayStrip />

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4 sm:gap-5 items-start">
        <DashboardMonthlyStats />
        <div className="space-y-4">
          <DashboardAlertsPanel />
          <Card padding="none" className="overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">Activité récente</h2>
            </div>
            <div className="divide-y divide-gray-50 max-h-56 overflow-y-auto">
              {recentActivity.length === 0 ? (
                <p className="p-4 text-sm text-gray-400 text-center">Aucune activité</p>
              ) : (
                recentActivity.map((h, i) => (
                  <div key={`${h.id}-${i}`} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor:
                          ETAT_CONFIG[h.etat_nouveau as EtatVehicule]?.color ?? '#94a3b8',
                      }}
                    />
                    <p className="flex-1 text-gray-700 truncate">
                      <span className="font-medium">
                        {h.vehicleModel || `Véhicule #${h.vehicule_id}`}
                      </span>
                      {' → '}
                      <span className="text-gray-500">
                        {labelEtatDashboard((h.etat_nouveau as EtatVehicule) || 'orange')}
                      </span>
                    </p>
                    <span className="text-[10px] text-gray-400 flex-shrink-0 tabular-nums">
                      {h.date_changement?.slice(5, 16).replace('T', ' ')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <Card padding="none" className="overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Urgents
            </h2>
            <button
              onClick={() => navigate('/vehicules?etat=rouge')}
              className="text-xs text-orange-600 hover:underline flex items-center gap-1 font-semibold"
            >
              Voir <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {urgents.length === 0 ? (
              <p className="p-4 text-sm text-gray-400 text-center">Aucun véhicule urgent</p>
            ) : (
              urgents.slice(0, 5).map(v => (
                <button
                  key={v.id}
                  onClick={() => navigate(`/vehicules/${v.id}`)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50/50 transition-colors text-left"
                >
                  <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{v.modele}</p>
                    <p className="text-xs text-gray-500">{v.immatriculation}</p>
                  </div>
                  <span className="text-xs text-red-600 font-medium">{daysSince(v.date_entree)}j</span>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card padding="none" className="overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
              <Clock className="w-4 h-4 text-amber-500" />
              Anciens (&gt; 7 jours)
            </h2>
          </div>
          <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {anciens.length === 0 ? (
              <p className="p-4 text-sm text-gray-400 text-center">Aucun véhicule ancien</p>
            ) : (
              anciens.slice(0, 5).map(v => (
                <button
                  key={v.id}
                  onClick={() => navigate(`/vehicules/${v.id}`)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-amber-50/50 transition-colors text-left"
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ETAT_CONFIG[v.etat_actuel].color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{v.modele}</p>
                    <p className="text-xs text-gray-500">
                      {v.immatriculation} · {labelEtatDashboard(v.etat_actuel)}
                    </p>
                  </div>
                  <span className="text-xs text-amber-600 font-medium">{daysSince(v.date_entree)}j</span>
                </button>
              ))
            )}
          </div>
        </Card>
      </div>

      {permissions.canManageUsers && (
        <Card padding="none" className="overflow-hidden border-stone-200/80 shadow-sm">
          <div className="px-4 sm:px-5 py-4 border-b border-stone-100 bg-[#faf8f5] flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-stone-600" />
                Équipe atelier
              </h2>
              <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5">
                Tous les états sauf archivés (validés)
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/utilisateurs')}
              className="text-xs font-medium text-stone-600 hover:text-stone-900 flex items-center gap-1"
            >
              Utilisateurs <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3 sm:p-4 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {teamRows.map(row => {
              const loadRatio = row.total / maxLoad
              const etatChips = ETATS_ACTIFS.filter(e => (row.byEtat[e] ?? 0) > 0)
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => openMember(row)}
                  className={cn(
                    'text-left rounded-2xl border bg-white p-3.5 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-stone-300',
                    row.urgents > 0
                      ? 'border-red-200 hover:border-red-300'
                      : row.total > 0
                        ? 'border-stone-200 hover:border-stone-300'
                        : 'border-stone-100 opacity-90'
                  )}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                        row.total === 0
                          ? 'bg-stone-100 text-stone-500'
                          : row.urgents > 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-900'
                      )}
                    >
                      {row.nom.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-stone-900 truncate leading-tight">
                        {row.nom}
                      </p>
                      <p className="text-[11px] text-stone-400 capitalize mt-0.5">{row.role}</p>
                    </div>
                    <span
                      className={cn(
                        'text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0',
                        row.total === 0
                          ? 'bg-stone-100 text-stone-500'
                          : row.urgents > 0
                            ? 'bg-red-50 text-red-700'
                            : 'bg-emerald-50 text-emerald-700'
                      )}
                    >
                      {row.total === 0 ? 'Libre' : row.urgents > 0 ? 'Urgent' : 'Actif'}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1.5 mb-2">
                    <span className="text-3xl font-bold text-stone-900 tabular-nums tracking-tight">
                      {row.total}
                    </span>
                    <span className="text-xs text-stone-500 font-medium">
                      véhicule{row.total !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="h-1 rounded-full bg-stone-100 overflow-hidden mb-2.5">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        row.urgents > 0 ? 'bg-red-400' : row.total > 0 ? 'bg-amber-500' : 'bg-stone-200'
                      )}
                      style={{ width: `${Math.max(row.total === 0 ? 0 : 6, loadRatio * 100)}%` }}
                    />
                  </div>

                  {etatChips.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {etatChips.map(etat => (
                        <span
                          key={etat}
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-md border"
                          style={{
                            color: ETAT_CONFIG[etat].color,
                            borderColor: `${ETAT_CONFIG[etat].color}33`,
                            backgroundColor: `${ETAT_CONFIG[etat].color}12`,
                          }}
                        >
                          {row.byEtat[etat]} {labelEtatDashboard(etat)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-stone-400">Aucun véhicule actif</p>
                  )}
                </button>
              )
            })}
          </div>
        </Card>
      )}

      <Modal
        open={selectedMember != null}
        onClose={closeMember}
        title={selectedMember?.nom ?? 'Membre'}
        subtitle={
          selectedMember
            ? `${selectedMember.total} véhicule(s) actif(s) · hors archivés`
            : undefined
        }
        maxWidth="lg"
      >
        {selectedMember && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {ETATS_ACTIFS.map(etat => {
                const n = selectedMember.byEtat[etat] ?? 0
                if (n <= 0) return null
                return (
                  <span
                    key={etat}
                    className="text-xs font-bold px-2.5 py-1 rounded-full border"
                    style={{
                      color: ETAT_CONFIG[etat].color,
                      borderColor: `${ETAT_CONFIG[etat].color}44`,
                      backgroundColor: `${ETAT_CONFIG[etat].color}14`,
                    }}
                  >
                    {n} {labelEtatDashboard(etat)}
                  </span>
                )
              })}
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2">
                Véhicules de {selectedMember.nom}
              </h3>
              {memberVehiclesLoading ? (
                <p className="text-sm text-stone-500 py-6 text-center">Chargement des véhicules…</p>
              ) : memberVehicles.length === 0 ? (
                <p className="text-sm text-stone-500 py-6 text-center">
                  Aucun véhicule actif trouvé pour ce membre.
                </p>
              ) : (
                <ul className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {memberVehicles.map(v => {
                    const etat = v.etat_actuel as EtatVehicule
                    const cfg = ETAT_CONFIG[etat]
                    const defaut = stripVehiculeAssigneesMeta(v.defaut || v.notes || '').trim()
                    return (
                      <li key={v.id}>
                        <button
                          type="button"
                          onClick={() => {
                            closeMember()
                            navigate(`/vehicules/${v.id}`)
                          }}
                          className="w-full text-left rounded-xl border border-stone-200 bg-white px-3.5 py-3 hover:border-amber-300 hover:bg-amber-50/40 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                              style={{ backgroundColor: cfg?.color ?? '#a8a29e' }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-bold text-stone-900 truncate">
                                  {v.modele || '—'}
                                </p>
                                <span
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                                  style={{
                                    color: cfg?.color,
                                    backgroundColor: `${cfg?.color ?? '#a8a29e'}18`,
                                  }}
                                >
                                  {cfg ? labelEtatDashboard(etat) : v.etat_actuel}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-stone-600 mt-0.5">
                                {v.immatriculation}
                              </p>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-stone-400">
                                <span>Entrée {v.date_entree || '—'}</span>
                                <span>{daysSince(v.date_entree)} j</span>
                                {v.type ? <span className="capitalize">{v.type}</span> : null}
                              </div>
                              {defaut ? (
                                <p className="text-xs text-stone-500 mt-1.5 line-clamp-2">{defaut}</p>
                              ) : null}
                            </div>
                            <ArrowRight className="w-4 h-4 text-stone-300 flex-shrink-0 mt-1" />
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="flex justify-end pt-1 border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  const id = selectedMember.id
                  closeMember()
                  navigate(`/vehicules?technicien=${id}`)
                }}
                className="text-sm font-medium text-stone-700 hover:text-stone-900 underline"
              >
                Voir dans Véhicules →
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
